export function RequirementsAudit() {
  const requirements = [
    {
      requirement: 'Filter panel with category options',
      status: 'covered',
      location: 'Left sidebar, lines 45-89'
    },
    {
      requirement: 'Sort dropdown (relevance, date, popularity)',
      status: 'covered',
      location: 'Top right, line 23'
    },
    {
      requirement: 'Search results as card grid',
      status: 'covered',
      location: 'Main area, lines 102-245'
    },
    {
      requirement: 'Pagination controls',
      status: 'covered',
      location: 'Bottom, lines 256-268'
    },
    {
      requirement: 'Selected filters display with clear action',
      status: 'partial',
      location: 'Top bar — missing clear all button'
    },
    {
      requirement: 'Real-time result count update',
      status: 'partial',
      location: 'Implemented but not reactive to filter changes'
    },
    {
      requirement: 'Save search preferences',
      status: 'partial',
      location: 'Backend endpoint exists, UI control missing'
    },
    {
      requirement: 'Export results as CSV',
      status: 'missing',
      location: 'Not implemented'
    },
    {
      requirement: 'Advanced date range picker',
      status: 'missing',
      location: 'Not implemented'
    },
    {
      requirement: 'Mobile responsive filter drawer',
      status: 'covered',
      location: 'Component implemented with breakpoints'
    },
    {
      requirement: 'Keyboard shortcuts for quick filtering',
      status: 'covered',
      location: 'Documented in lines 12-18'
    },
    {
      requirement: 'Loading states for async operations',
      status: 'covered',
      location: 'Skeleton components, lines 67-82'
    }
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-xs text-gray-600" style={{ fontWeight: 600 }}>REQUIREMENT</th>
            <th className="text-left py-3 px-4 text-xs text-gray-600" style={{ fontWeight: 600 }}>STATUS</th>
            <th className="text-left py-3 px-4 text-xs text-gray-600" style={{ fontWeight: 600 }}>LOCATION</th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((req, index) => (
            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">{req.requirement}</td>
              <td className="py-3 px-4">
                {req.status === 'covered' && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs" style={{ fontWeight: 600 }}>
                    ✓ Covered
                  </span>
                )}
                {req.status === 'partial' && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs" style={{ fontWeight: 600 }}>
                    ◐ Partial
                  </span>
                )}
                {req.status === 'missing' && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs" style={{ fontWeight: 600 }}>
                    ✕ Missing
                  </span>
                )}
              </td>
              <td className="py-3 px-4 text-gray-600">{req.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
