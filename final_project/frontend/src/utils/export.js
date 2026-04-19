/**
 * Resolvo Export Utility
 */

export const exportToCSV = (complaints) => {
  const headers = ['ID', 'Title', 'Category', 'Priority', 'Status', 'Sentiment', 'Resolution', 'Assigned To', 'Created At'];
  const rows = complaints.map(c => [
    c.id,
    `"${c.title}"`,
    c.category,
    c.priority,
    c.status,
    c.sentiment.label,
    `"${c.resolution}"`,
    c.assignedTo,
    c.createdAt
  ]);

  const csvContent = "data:text/csv;charset=utf-8," 
    + headers.join(",") + "\n" 
    + rows.map(e => e.join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `resolvo_complaints_report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
