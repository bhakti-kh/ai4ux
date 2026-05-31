export function JSONView() {
  const jsonData = {
    analysis: {
      timestamp: '2026-05-29T14:32:18Z',
      jiraTicket: {
        key: 'PROJ-456',
        title: 'Implement new search filtering UI with advanced options',
        status: 'In Progress',
        type: 'Feature',
        priority: 'High',
        requirements: 12,
        acceptanceCriteria: 8
      },
      screen: {
        filename: 'search-ui-mockup.png',
        dimensions: { width: 1920, height: 1080 },
        componentsDetected: 8,
        carbonComponents: 6,
        customComponents: 2
      },
      compliance: {
        score: 87,
        covered: 12,
        partial: 3,
        missing: 2,
        totalRequirements: 17
      },
      components: [
        {
          name: 'SearchInput',
          type: 'Input',
          instances: 1,
          complexity: 'Simple',
          carbonEquivalent: 'Search'
        },
        {
          name: 'FilterPanel',
          type: 'Container',
          instances: 1,
          complexity: 'Complex',
          carbonEquivalent: 'Accordion + Checkbox Group'
        },
        {
          name: 'SortDropdown',
          type: 'Select',
          instances: 1,
          complexity: 'Simple',
          carbonEquivalent: 'Dropdown'
        },
        {
          name: 'ResultCard',
          type: 'Card',
          instances: 12,
          complexity: 'Medium',
          carbonEquivalent: 'Tile'
        }
      ],
      gaps: [
        {
          title: 'Export to CSV functionality missing',
          severity: 'high',
          effort: '2-3 days'
        },
        {
          title: 'Advanced date range picker not implemented',
          severity: 'high',
          effort: '3-4 days'
        }
      ],
      recommendations: [
        {
          category: 'UX Enhancement',
          priority: 'High',
          title: 'Add filter preview on hover',
          effort: '2 days'
        },
        {
          category: 'Accessibility',
          priority: 'High',
          title: 'Improve keyboard navigation in filter panel',
          effort: '3 days'
        }
      ]
    }
  };

  return (
    <div className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
      <pre className="text-sm">
        <code>{JSON.stringify(jsonData, null, 2)}</code>
      </pre>
    </div>
  );
}
