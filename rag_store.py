"""
rag_store.py  —  Ai4UX Vector RAG Layer (Sprint 7A)
====================================================
Embedded ChromaDB with 5 collections:
  • guidelines       — WCAG / Nielsen / ARIA / platform criteria (built-in + custom)
  • conventions      — accepted/edited user conventions  
  • components       — confirmed DS components (name, type, design_specs)
  • product_context  — accumulated product intelligence
  • ds_files         — parsed design-system file content chunks

Usage pattern
-------------
  from rag_store import rag
  rag.ingest_all(db_conn, user_id)          # on startup / login
  results = rag.query_guidelines("button contrast ratio", user_id, n=5)
  context = rag.build_analysis_context(components, user_id)

All public methods are safe to call even if ChromaDB is unavailable —
they return empty lists/strings so the rest of the app never breaks.
"""

import os
import json
import hashlib
import logging
from typing import Any

logger = logging.getLogger(__name__)

# ── ChromaDB boot ─────────────────────────────────────────────────────────────
_CHROMA_PATH = os.environ.get("CHROMA_PATH", "/tmp/chroma_db")
try:
    if os.environ.get("DISABLE_CHROMA"):
        raise ImportError("ChromaDB disabled via DISABLE_CHROMA env var")
    import chromadb
    from chromadb.utils import embedding_functions

    _ef = embedding_functions.DefaultEmbeddingFunction()   # all-MiniLM-L6-v2
    _client = chromadb.PersistentClient(path=_CHROMA_PATH)
    _CHROMA_OK = True
    logger.info(f"ChromaDB initialised at {_CHROMA_PATH}")
except Exception as e:
    _CHROMA_OK = False
    _client = None
    _ef = None
    logger.warning(f"ChromaDB unavailable — RAG disabled. Reason: {e}")


# ── Collection registry ────────────────────────────────────────────────────────
_COLLECTIONS = {
    "guidelines":      "ai4ux_guidelines",
    "conventions":     "ai4ux_conventions",
    "components":      "ai4ux_components",
    "product_context": "ai4ux_product_context",
    "ds_files":        "ai4ux_ds_files",
}

def _col(name: str):
    """Get or create a ChromaDB collection. Returns None if Chroma is down."""
    if not _CHROMA_OK:
        return None
    try:
        return _client.get_or_create_collection(
            name=_COLLECTIONS[name],
            embedding_function=_ef,
            metadata={"hnsw:space": "cosine"},
        )
    except Exception as e:
        logger.error(f"Failed to get collection '{name}': {e}")
        return None


def _doc_id(*parts) -> str:
    """Stable, collision-resistant ID from arbitrary parts."""
    raw = "|".join(str(p) for p in parts)
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def _safe_upsert(col, ids, documents, metadatas):
    """Upsert with error swallowing so callers never crash."""
    if col is None:
        return
    try:
        col.upsert(ids=ids, documents=documents, metadatas=metadatas)
    except Exception as e:
        logger.error(f"ChromaDB upsert failed: {e}")


def _safe_query(col, query_texts, n_results=5, where=None):
    """Query with graceful fallback."""
    if col is None:
        return []
    try:
        kwargs: dict[str, Any] = {
            "query_texts": query_texts,
            "n_results": min(n_results, col.count() or 1),
        }
        if where:
            kwargs["where"] = where
        res = col.query(**kwargs)
        # Flatten: [{doc, meta, distance}, ...]
        out = []
        docs = res.get("documents", [[]])[0]
        metas = res.get("metadatas", [[]])[0]
        dists = res.get("distances", [[]])[0]
        for doc, meta, dist in zip(docs, metas, dists):
            out.append({"text": doc, "meta": meta, "score": 1 - dist})
        return out
    except Exception as e:
        logger.error(f"ChromaDB query failed: {e}")
        return []


# ══════════════════════════════════════════════════════════════════════════════
# INGESTION
# ══════════════════════════════════════════════════════════════════════════════

class RagStore:

    # ── Built-in guidelines ──────────────────────────────────────────────────

    def ingest_builtin_guidelines(self, guidelines_dict: dict):
        """
        Ingest BUILTIN_GUIDELINES from ai4ux.py into the guidelines collection.
        Call once on startup.  Safe to re-call (upsert is idempotent).
        
        guidelines_dict format:
          { "wcag_aa": { "name": ..., "criteria": { "1.1.1": { "title", "description",
            "fix", "components", "level"? } } }, ... }
        """
        col = _col("guidelines")
        if col is None:
            return

        ids, docs, metas = [], [], []
        for set_key, gset in guidelines_dict.items():
            set_name = gset.get("name", set_key)
            category = gset.get("category", "general")
            for crit_id, crit in gset.get("criteria", {}).items():
                # Build rich text for embedding
                components_str = ", ".join(crit.get("components", []))
                text = (
                    f"{set_name} — {crit.get('title', crit_id)}\n"
                    f"Criterion: {crit_id}\n"
                    f"Description: {crit.get('description', '')}\n"
                    f"Fix: {crit.get('fix', '')}\n"
                    f"Applies to: {components_str}"
                )
                doc_id = _doc_id("builtin", set_key, crit_id)
                ids.append(doc_id)
                docs.append(text)
                metas.append({
                    "source": "builtin",
                    "guideline_set": set_key,
                    "guideline_name": set_name,
                    "criterion_id": crit_id,
                    "title": crit.get("title", ""),
                    "category": category,
                    "level": crit.get("level", ""),
                    "components": components_str,
                    "fix": crit.get("fix", ""),
                    "url": crit.get("url", ""),
                })

        _safe_upsert(col, ids, docs, metas)
        logger.info(f"Ingested {len(ids)} built-in guideline criteria")

    def ingest_custom_guidelines(self, user_id: str, file_id: int,
                                  filename: str, content: str):
        """
        Ingest a user-uploaded custom guidelines file (plain text / JSON).
        Chunks by paragraph (double newline) — max 800 chars per chunk.
        """
        col = _col("guidelines")
        if col is None:
            return

        chunks = _chunk_text(content, max_chars=800)
        ids, docs, metas = [], [], []
        for i, chunk in enumerate(chunks):
            doc_id = _doc_id("custom", user_id, file_id, i)
            ids.append(doc_id)
            docs.append(chunk)
            metas.append({
                "source": "custom",
                "user_id": user_id,
                "file_id": str(file_id),
                "filename": filename,
                "chunk_index": i,
                "guideline_set": f"custom_{file_id}",
                "guideline_name": filename,
                "category": "custom",
                "criterion_id": f"custom_{file_id}_{i}",
                "title": f"{filename} (chunk {i+1})",
                "level": "",
                "components": "",
                "fix": "",
                "url": "",
            })

        _safe_upsert(col, ids, docs, metas)
        logger.info(f"Ingested custom guideline '{filename}' ({len(ids)} chunks) for {user_id}")

    # ── Conventions ──────────────────────────────────────────────────────────

    def ingest_convention(self, user_id: str, convention_id: int,
                           recommendation: str, decision: str,
                           edited_text: str = ""):
        """Ingest a single accepted/edited convention. Call on write."""
        col = _col("conventions")
        if col is None:
            return
        text = edited_text or recommendation
        doc_id = _doc_id("convention", user_id, convention_id)
        _safe_upsert(
            col,
            [doc_id],
            [f"Convention: {text}\nDecision: {decision}"],
            [{"user_id": user_id, "convention_id": str(convention_id),
              "decision": decision, "text": text[:500]}],
        )

    def ingest_conventions_bulk(self, user_id: str, rows: list[dict]):
        """Bulk ingest from DB rows. rows = list of convention dicts."""
        col = _col("conventions")
        if col is None:
            return
        ids, docs, metas = [], [], []
        for r in rows:
            cid = r.get("id") or r.get("convention_id", "")
            text = r.get("edited_text") or r.get("recommendation", "")
            decision = r.get("decision", "accepted")
            doc_id = _doc_id("convention", user_id, cid)
            ids.append(doc_id)
            docs.append(f"Convention: {text}\nDecision: {decision}")
            metas.append({"user_id": user_id, "convention_id": str(cid),
                          "decision": decision, "text": text[:500]})
        if ids:
            _safe_upsert(col, ids, docs, metas)
            logger.info(f"Ingested {len(ids)} conventions for {user_id}")

    # ── DS Components ────────────────────────────────────────────────────────

    def ingest_component(self, user_id: str, component_id: int,
                          name: str, comp_type: str,
                          design_specs: str, status: str = "confirmed"):
        """Ingest a single generated/confirmed component. Call on write."""
        col = _col("components")
        if col is None:
            return
        specs_text = design_specs if isinstance(design_specs, str) else json.dumps(design_specs)
        doc_id = _doc_id("component", user_id, component_id)
        _safe_upsert(
            col,
            [doc_id],
            [f"Component: {name}\nType: {comp_type}\nSpecs: {specs_text[:600]}"],
            [{"user_id": user_id, "component_id": str(component_id),
              "name": name, "type": comp_type, "status": status}],
        )

    def ingest_components_bulk(self, user_id: str, rows: list[dict]):
        """Bulk ingest from generated_components table rows."""
        col = _col("components")
        if col is None:
            return
        ids, docs, metas = [], [], []
        for r in rows:
            cid = r.get("id") or r.get("component_id", "")
            name = r.get("name", "")
            ctype = r.get("type", "")
            specs = r.get("design_specs", "") or ""
            if isinstance(specs, dict):
                specs = json.dumps(specs)
            status = r.get("status", "confirmed")
            doc_id = _doc_id("component", user_id, cid)
            ids.append(doc_id)
            docs.append(f"Component: {name}\nType: {ctype}\nSpecs: {specs[:600]}")
            metas.append({"user_id": user_id, "component_id": str(cid),
                          "name": name, "type": ctype, "status": status})
        if ids:
            _safe_upsert(col, ids, docs, metas)
            logger.info(f"Ingested {len(ids)} components for {user_id}")

    # ── Product Context ──────────────────────────────────────────────────────

    def ingest_product_context(self, user_id: str, product_name: str,
                                feature_domain: str, insight: str, ctx_id: int):
        """Ingest a single product context insight. Call on write."""
        col = _col("product_context")
        if col is None:
            return
        doc_id = _doc_id("product_ctx", user_id, ctx_id)
        text = f"Product: {product_name}\nDomain: {feature_domain}\nInsight: {insight}"
        _safe_upsert(
            col,
            [doc_id],
            [text],
            [{"user_id": user_id, "product_name": product_name,
              "feature_domain": feature_domain, "ctx_id": str(ctx_id)}],
        )

    def ingest_product_context_bulk(self, user_id: str, rows: list[dict]):
        """Bulk ingest from product_context table rows."""
        col = _col("product_context")
        if col is None:
            return
        ids, docs, metas = [], [], []
        for r in rows:
            ctx_id = r.get("id") or r.get("ctx_id", "")
            product_name = r.get("product_name", "")
            feature_domain = r.get("feature_domain", "")
            insight = r.get("insight", "")
            doc_id = _doc_id("product_ctx", user_id, ctx_id)
            ids.append(doc_id)
            docs.append(f"Product: {product_name}\nDomain: {feature_domain}\nInsight: {insight}")
            metas.append({"user_id": user_id, "product_name": product_name,
                          "feature_domain": feature_domain, "ctx_id": str(ctx_id)})
        if ids:
            _safe_upsert(col, ids, docs, metas)
            logger.info(f"Ingested {len(ids)} product context items for {user_id}")

    # ── DS Files ─────────────────────────────────────────────────────────────

    def ingest_ds_file(self, user_id: str, file_id: int,
                        filename: str, content: str):
        """Chunk and ingest a user-uploaded design system file."""
        col = _col("ds_files")
        if col is None:
            return
        chunks = _chunk_text(content, max_chars=700)
        ids, docs, metas = [], [], []
        for i, chunk in enumerate(chunks):
            doc_id = _doc_id("ds_file", user_id, file_id, i)
            ids.append(doc_id)
            docs.append(chunk)
            metas.append({"user_id": user_id, "file_id": str(file_id),
                          "filename": filename, "chunk_index": i})
        if ids:
            _safe_upsert(col, ids, docs, metas)
            logger.info(f"Ingested DS file '{filename}' ({len(ids)} chunks) for {user_id}")

    # ── Full warm-up from DB ─────────────────────────────────────────────────

    def ingest_all(self, db_conn, user_id: str,
                   builtin_guidelines: dict = None):
        """
        Full warm-up: pull everything from PostgreSQL for this user and
        (re)populate ChromaDB.  Call on app startup or after login.
        
        db_conn: the _PGConn / sqlite3 connection from ai4ux.py
        builtin_guidelines: pass BUILTIN_GUIDELINES dict from ai4ux.py
        """
        if not _CHROMA_OK:
            return

        try:
            # 1. Built-in guidelines (global, not per-user)
            if builtin_guidelines:
                self.ingest_builtin_guidelines(builtin_guidelines)

            # 2. Custom guidelines for this user
            try:
                rows = db_conn.execute(
                    "SELECT id, filename, content FROM custom_guidelines WHERE user_id = ?",
                    (user_id,)
                ).fetchall()
                for r in rows:
                    self.ingest_custom_guidelines(
                        user_id, r["id"], r["filename"], r.get("content", "")
                    )
            except Exception as e:
                logger.warning(f"Could not ingest custom_guidelines: {e}")

            # 3. Conventions
            try:
                rows = db_conn.execute(
                    "SELECT id, description as recommendation, feedback_type as decision, description as edited_text FROM conventions WHERE user_id = %s",
                    (user_id,)
                ).fetchall()
                self.ingest_conventions_bulk(user_id, rows)
            except Exception as e:
                logger.warning(f"Could not ingest conventions: {e}")

            # 4. Generated components
            try:
                rows = db_conn.execute(
                    "SELECT id, name, type, design_specs, status "
                    "FROM generated_components WHERE user_id = ?",
                    (user_id,)
                ).fetchall()
                self.ingest_components_bulk(user_id, rows)
            except Exception as e:
                logger.warning(f"Could not ingest components: {e}")

            # 5. Product context
            try:
                rows = db_conn.execute(
                    "SELECT id, product_name, feature_domain, insight "
                    "FROM product_context WHERE user_id = ?",
                    (user_id,)
                ).fetchall()
                self.ingest_product_context_bulk(user_id, rows)
            except Exception as e:
                logger.warning(f"Could not ingest product_context: {e}")

            # 6. DS files
            try:
                rows = db_conn.execute(
                    "SELECT id, filename, content FROM ds_files WHERE user_id = ?",
                    (user_id,)
                ).fetchall()
                for r in rows:
                    if r.get("content"):
                        self.ingest_ds_file(user_id, r["id"], r["filename"],
                                             r["content"])
            except Exception as e:
                logger.warning(f"Could not ingest ds_files: {e}")

            logger.info(f"RAG warm-up complete for user {user_id}")

        except Exception as e:
            logger.error(f"ingest_all failed: {e}")


    # ══════════════════════════════════════════════════════════════════════════
    # QUERY
    # ══════════════════════════════════════════════════════════════════════════

    def query_guidelines(self, query: str, user_id: str,
                          n: int = 6) -> list[dict]:
        """
        Semantic search over guidelines (built-in + user's custom).
        Returns list of {text, meta, score}.
        """
        col = _col("guidelines")
        # Include both global (no user_id) and user-specific custom guidelines
        # We query without user filter to get built-ins, then re-rank
        results = _safe_query(col, [query], n_results=n * 2)
        # Filter: keep built-ins (source=builtin) + this user's custom ones
        filtered = [
            r for r in results
            if r["meta"].get("source") == "builtin"
            or r["meta"].get("user_id") == user_id
        ]
        return filtered[:n]

    def query_conventions(self, query: str, user_id: str,
                           n: int = 5) -> list[dict]:
        """Semantic search over user's accepted conventions."""
        col = _col("conventions")
        return _safe_query(col, [query], n_results=n,
                           where={"user_id": user_id})

    def query_components(self, query: str, user_id: str,
                          n: int = 5) -> list[dict]:
        """Semantic search over user's confirmed DS components."""
        col = _col("components")
        return _safe_query(col, [query], n_results=n,
                           where={"user_id": user_id})

    def query_product_context(self, query: str, user_id: str,
                               n: int = 4) -> list[dict]:
        """Semantic search over accumulated product intelligence."""
        col = _col("product_context")
        return _safe_query(col, [query], n_results=n,
                           where={"user_id": user_id})

    def query_ds_files(self, query: str, user_id: str,
                        n: int = 4) -> list[dict]:
        """Semantic search over uploaded DS file content."""
        col = _col("ds_files")
        return _safe_query(col, [query], n_results=n,
                           where={"user_id": user_id})


    # ══════════════════════════════════════════════════════════════════════════
    # CONTEXT BUILDERS  (used in Claude prompt construction)
    # ══════════════════════════════════════════════════════════════════════════

    def build_analysis_context(self, components_detected: list[str],
                                user_id: str,
                                screen_description: str = "") -> str:
        """
        Build a RAG context block to prepend to the spec-analysis prompt.
        
        components_detected: list of component names found in the screen
        Returns: formatted string ready to inject into Claude prompt
        """
        if not _CHROMA_OK:
            return ""

        query = screen_description or " ".join(components_detected[:8])
        if not query.strip():
            return ""

        sections = []

        # 1. Relevant guidelines
        guide_hits = self.query_guidelines(query, user_id, n=8)
        if guide_hits:
            g_lines = []
            for h in guide_hits:
                m = h["meta"]
                g_lines.append(
                    f"  [{m.get('criterion_id','')}] {m.get('title','')} "
                    f"({m.get('guideline_name','')}) — {m.get('fix','')}"
                )
            sections.append("RELEVANT GUIDELINES (semantic match):\n" + "\n".join(g_lines))

        # 2. User's established conventions
        conv_hits = self.query_conventions(query, user_id, n=4)
        if conv_hits:
            c_lines = [f"  • {h['meta'].get('text','')}" for h in conv_hits]
            sections.append("ESTABLISHED CONVENTIONS FOR THIS PRODUCT:\n" + "\n".join(c_lines))

        # 3. Existing DS components (detect conflicts / reuse opportunities)
        comp_hits = self.query_components(query, user_id, n=5)
        if comp_hits:
            k_lines = [
                f"  • {h['meta'].get('name','')} ({h['meta'].get('type','')})"
                for h in comp_hits
            ]
            sections.append("EXISTING DS COMPONENTS (check for reuse/conflicts):\n" + "\n".join(k_lines))

        # 4. Product context
        ctx_hits = self.query_product_context(query, user_id, n=3)
        if ctx_hits:
            p_lines = [f"  • {h['text'][:200]}" for h in ctx_hits]
            sections.append("PRODUCT CONTEXT:\n" + "\n".join(p_lines))

        if not sections:
            return ""

        return (
            "=== RAG CONTEXT (retrieved from your design system knowledge base) ===\n\n"
            + "\n\n".join(sections)
            + "\n\n=== END RAG CONTEXT ===\n"
        )

    def build_component_gen_context(self, component_name: str,
                                     component_type: str,
                                     user_id: str) -> str:
        """
        Context block for component generator:
        - Similar existing components to avoid duplication
        - Relevant guidelines for this component type
        - DS file tokens/patterns
        """
        if not _CHROMA_OK:
            return ""

        query = f"{component_name} {component_type}"
        sections = []

        comp_hits = self.query_components(query, user_id, n=4)
        if comp_hits:
            lines = [
                f"  • {h['meta'].get('name','')} ({h['meta'].get('type','')}): "
                f"{h['text'][:180]}"
                for h in comp_hits
            ]
            sections.append(
                "SIMILAR EXISTING COMPONENTS (reuse patterns, avoid duplication):\n"
                + "\n".join(lines)
            )

        guide_hits = self.query_guidelines(query, user_id, n=6)
        if guide_hits:
            lines = [
                f"  [{h['meta'].get('criterion_id','')}] {h['meta'].get('title','')} "
                f"— {h['meta'].get('fix','')}"
                for h in guide_hits
            ]
            sections.append(
                "GUIDELINES TO SATISFY FOR THIS COMPONENT:\n" + "\n".join(lines)
            )

        ds_hits = self.query_ds_files(query, user_id, n=3)
        if ds_hits:
            lines = [f"  • {h['text'][:200]}" for h in ds_hits]
            sections.append("DS FILE TOKENS / PATTERNS:\n" + "\n".join(lines))

        if not sections:
            return ""

        return (
            "=== RAG CONTEXT FOR COMPONENT GENERATION ===\n\n"
            + "\n\n".join(sections)
            + "\n\n=== END RAG CONTEXT ===\n"
        )

    def build_guideline_conflict_context(self, guideline_a: str,
                                          guideline_b: str,
                                          user_id: str) -> str:
        """Context for guideline conflict resolution."""
        if not _CHROMA_OK:
            return ""

        query = f"{guideline_a} {guideline_b} conflict resolution"
        sections = []

        # Prior resolutions the user has made
        conv_hits = self.query_conventions(query, user_id, n=5)
        if conv_hits:
            lines = [f"  • {h['meta'].get('text','')}" for h in conv_hits]
            sections.append("PRIOR USER DECISIONS ON SIMILAR CONFLICTS:\n" + "\n".join(lines))

        guide_hits = self.query_guidelines(query, user_id, n=6)
        if guide_hits:
            lines = [
                f"  [{h['meta'].get('criterion_id','')}] {h['meta'].get('title','')} "
                f"— {h['meta'].get('fix','')}"
                for h in guide_hits
            ]
            sections.append("RELATED GUIDELINE CRITERIA:\n" + "\n".join(lines))

        if not sections:
            return ""

        return (
            "=== RAG CONTEXT FOR CONFLICT RESOLUTION ===\n\n"
            + "\n\n".join(sections)
            + "\n\n=== END RAG CONTEXT ===\n"
        )

    # ── Stats (for the UI status panel) ─────────────────────────────────────

    def stats(self, user_id: str) -> dict:
        """Return collection sizes for display."""
        if not _CHROMA_OK:
            return {"available": False}
        out = {"available": True, "collections": {}}
        for key in _COLLECTIONS:
            col = _col(key)
            if col:
                try:
                    out["collections"][key] = col.count()
                except Exception:
                    out["collections"][key] = -1
        return out

    def reset_user(self, user_id: str):
        """Delete all vectors for a specific user (GDPR / account deletion)."""
        if not _CHROMA_OK:
            return
        user_collections = ["conventions", "components", "product_context", "ds_files"]
        for key in user_collections:
            col = _col(key)
            if col is None:
                continue
            try:
                existing = col.get(where={"user_id": user_id})
                ids = existing.get("ids", [])
                if ids:
                    col.delete(ids=ids)
                    logger.info(f"Deleted {len(ids)} vectors from '{key}' for {user_id}")
            except Exception as e:
                logger.warning(f"Could not reset collection '{key}' for {user_id}: {e}")


# ── Text chunker ─────────────────────────────────────────────────────────────

def _chunk_text(text: str, max_chars: int = 700) -> list[str]:
    """Split text into paragraphs, then merge short ones up to max_chars."""
    if not text:
        return []
    raw_chunks = [p.strip() for p in text.split("\n\n") if p.strip()]
    merged, current = [], ""
    for chunk in raw_chunks:
        if len(current) + len(chunk) + 2 <= max_chars:
            current = (current + "\n\n" + chunk).strip()
        else:
            if current:
                merged.append(current)
            # If a single paragraph exceeds max_chars, hard-split it
            if len(chunk) > max_chars:
                for i in range(0, len(chunk), max_chars):
                    merged.append(chunk[i:i + max_chars])
                current = ""
            else:
                current = chunk
    if current:
        merged.append(current)
    return merged


# ── Singleton ────────────────────────────────────────────────────────────────
rag = RagStore()
