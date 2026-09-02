import React from 'react';
import { Card, Title, Text, Flex } from '@tremor/react';
import { Download, FileText, BarChartHorizontal, PieChart, Calendar, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const RESTRICTED_ORGANIZATIONS = [
  'Women with a Mission',
  "Islamic Women's Initiative for Justice Law and Peace",
  'SPRINGS PUBLIC INTEREST HUB',
  'Center for Health, Human Rights and Development',
  'THE AFRICAN INSTITUTE FOR INVESTIGATIVE JOURNALISM',
  'Centre for Women Justice Uganda',
  'FEMME FORTE',
  'Ubuntu Justice center',
  'Dumaic Global Health'
];

const escapeCSV = (val: unknown): string => {
  const str = val == null ? '' : String(val);
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const ReportGenerationSystem: React.FC = () => {
  const [selectedMetrics, setSelectedMetrics] = React.useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = React.useState<string>('pdf');
  const [dateRange, setDateRange] = React.useState<[string, string]>(['', '']);
  const [loading, setLoading] = React.useState(false);
  const [reportStats, setReportStats] = React.useState({
    totalCases: 0,
    completedCases: 0,
    successRate: 0,
    avgProcessingTime: 0
  });
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [userOrganization, setUserOrganization] = React.useState<string | null>(null);
  const [isModerator, setIsModerator] = React.useState(false);

  React.useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization, is_moderator')
          .eq('id', user.id)
          .maybeSingle();
        if (profile) {
          setUserOrganization(profile.organization);
          setIsModerator(profile.is_moderator || false);
        }
      }
      await fetchReportStats();
    };
    initialize();
  }, []);

  const buildBaseQuery = () => {
    const isAfyanahakiModerator = isModerator && userOrganization === 'Afya na Haki';
    const isRestricted = RESTRICTED_ORGANIZATIONS.includes(userOrganization || '');

    let q = supabase
      .from('cases')
      .select(`
        id, case_filed, case_summary, status, created_at,
        priority_level, case_categories, partner, client_satisfaction,
        countries (name),
        profiles:user_id (full_name, organization)
      `)
      .eq('moderation_status', 'approved');

    if (!isAfyanahakiModerator && (isRestricted || !isModerator) && currentUserId) {
      q = q.eq('user_id', currentUserId);
    }

    if (dateRange[0]) q = q.gte('created_at', dateRange[0]);
    if (dateRange[1]) q = q.lte('created_at', dateRange[1] + 'T23:59:59');

    return q;
  };

  const fetchReportStats = async () => {
    try {
      setLoading(true);
      const isAfyanahakiModerator = isModerator && userOrganization === 'Afya na Haki';
      const isRestricted = RESTRICTED_ORGANIZATIONS.includes(userOrganization || '');

      let q = supabase
        .from('cases')
        .select('id, status, created_at, client_satisfaction, user_id')
        .eq('moderation_status', 'approved');

      if (!isAfyanahakiModerator && (isRestricted || !isModerator) && currentUserId) {
        q = q.eq('user_id', currentUserId);
      }

      const { data: cases } = await q;
      if (!cases || cases.length === 0) return;

      const totalCases = cases.length;
      const completedCases = cases.filter(c => c.status === 'completed').length;
      const scores = cases.filter(c => c.status === 'completed' && c.client_satisfaction).map(c => c.client_satisfaction);
      const avg = scores.length ? scores.reduce((s: number, v: number) => s + v, 0) / scores.length : 0;
      const successRate = Math.round((avg / 5) * 100);
      const times = cases.filter(c => c.status === 'completed' && c.created_at).map(c =>
        Math.ceil(Math.abs(Date.now() - new Date(c.created_at).getTime()) / 86400000)
      );
      const avgProcessingTime = times.length ? Math.round(times.reduce((s, v) => s + v, 0) / times.length) : 0;

      setReportStats({ totalCases, completedCases, successRate, avgProcessingTime });
    } catch (err) {
      console.error('Error fetching report stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Build CSV rows from case data based on selected metrics
  const buildCSVFromCases = (cases: any[], metrics: string[]): string => {
    const headerMap: Record<string, string[]> = {
      case_volume: ['Case Title', 'Status', 'Date Filed'],
      success_rates: ['Case Title', 'Status', 'Client Satisfaction'],
      geographic: ['Case Title', 'Country'],
      timeline: ['Case Title', 'Date Filed', 'Status'],
      stakeholders: ['Case Title', 'Partner Organization', 'Submitted By', 'Organization'],
      legal_framework: ['Case Title', 'Category', 'Priority'],
    };

    const allMetrics = metrics.length ? metrics : Object.keys(headerMap);
    const headers = new Set<string>(['Case ID', 'Case Title']);
    allMetrics.forEach(m => headerMap[m]?.forEach(h => headers.add(h)));

    const headerRow = Array.from(headers).map(escapeCSV).join(',');

    const rows = cases.map(c => {
      const row: Record<string, unknown> = {
        'Case ID': c.id,
        'Case Title': c.case_filed,
        'Status': c.status,
        'Date Filed': c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
        'Client Satisfaction': c.client_satisfaction ?? '',
        'Country': (c.countries as any)?.name ?? '',
        'Partner Organization': c.partner ?? '',
        'Submitted By': (c.profiles as any)?.full_name ?? '',
        'Organization': (c.profiles as any)?.organization ?? '',
        'Category': Array.isArray(c.case_categories) ? c.case_categories.join('; ') : (c.case_categories ?? ''),
        'Priority': c.priority_level ?? '',
        'Summary': c.case_summary ?? '',
      };
      return Array.from(headers).map(h => escapeCSV(row[h])).join(',');
    });

    return [headerRow, ...rows].join('\r\n');
  };

  // Build summary CSV for template reports
  const buildSummaryCSV = (title: string, rows: [string, unknown][]): string => {
    const header = `${escapeCSV(title)} - Generated ${new Date().toLocaleDateString()}`;
    const lines = rows.map(([label, value]) => `${escapeCSV(label)},${escapeCSV(value)}`);
    return [header, '', ...lines].join('\r\n');
  };

  // Open a printable HTML window (save as PDF via browser print dialog)
  const openPrintWindow = (title: string, bodyHTML: string) => {
    const win = window.open('', '_blank');
    if (!win) { toast.error('Pop-up blocked. Allow pop-ups to download PDF.'); return; }
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; color: #111; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .meta { font-size: 11px; color: #666; margin-bottom: 16px; }
          table { border-collapse: collapse; width: 100%; margin-top: 16px; }
          th { background: #8b1a1a; color: #fff; text-align: left; padding: 8px 10px; font-size: 11px; }
          td { border: 1px solid #ddd; padding: 6px 10px; vertical-align: top; }
          tr:nth-child(even) td { background: #f9f9f9; }
          .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
          .stat { background: #f4f4f4; padding: 12px; border-radius: 4px; }
          .stat .label { font-size: 10px; color: #666; text-transform: uppercase; }
          .stat .value { font-size: 20px; font-weight: bold; margin-top: 4px; }
          @media print { @page { margin: 1cm; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">Generated: ${new Date().toLocaleString()}</div>
        ${bodyHTML}
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const handleGenerateReport = async () => {
    if (selectedMetrics.length === 0) {
      toast.error('Please select at least one metric');
      return;
    }

    setLoading(true);
    try {
      const { data: cases, error } = await buildBaseQuery();
      if (error) throw error;
      if (!cases || cases.length === 0) {
        toast.error('No data available for the selected criteria');
        return;
      }

      const dateSuffix = new Date().toISOString().slice(0, 10);

      if (selectedFormat === 'csv') {
        const csv = buildCSVFromCases(cases, selectedMetrics);
        downloadFile(csv, `report-${dateSuffix}.csv`, 'text/csv;charset=utf-8;');
        toast.success(`Downloaded CSV with ${cases.length} records`);

      } else if (selectedFormat === 'excel') {
        const csv = buildCSVFromCases(cases, selectedMetrics);
        downloadFile(csv, `report-${dateSuffix}.csv`, 'text/csv;charset=utf-8;');
        toast.success(`Downloaded Excel-compatible file with ${cases.length} records`);

      } else if (selectedFormat === 'pdf') {
        const metricLabels: Record<string, string> = {
          case_volume: 'Case Volume',
          success_rates: 'Success Rates',
          geographic: 'Geographical Distribution',
          timeline: 'Timeline Analysis',
          stakeholders: 'Stakeholder Analysis',
          legal_framework: 'Legal Framework',
        };

        const tableHeaders = ['Case Title', 'Status', 'Date Filed', 'Country', 'Priority', 'Category'];
        const tableRows = cases.map(c => [
          (c as any).case_filed,
          (c as any).status,
          (c as any).created_at ? new Date((c as any).created_at).toLocaleDateString() : '',
          (c as any).countries?.name ?? '',
          (c as any).priority_level ?? '',
          Array.isArray((c as any).case_categories) ? (c as any).case_categories.join(', ') : ((c as any).case_categories ?? ''),
        ]);

        const statsHTML = `
          <div class="stat-grid">
            <div class="stat"><div class="label">Total Cases</div><div class="value">${cases.length}</div></div>
            <div class="stat"><div class="label">Completed</div><div class="value">${cases.filter((c: any) => c.status === 'completed').length}</div></div>
            <div class="stat"><div class="label">Metrics</div><div class="value" style="font-size:13px">${selectedMetrics.map(m => metricLabels[m]).join(', ')}</div></div>
          </div>
        `;

        const tableHTML = `
          <table>
            <thead><tr>${tableHeaders.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${tableRows.map(row => `<tr>${row.map(cell => `<td>${cell ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        `;

        openPrintWindow('Custom Report', statsHTML + tableHTML);
        toast.success('Print dialog opened — choose "Save as PDF"');

      } else if (selectedFormat === 'ppt') {
        // Generate a tabular CSV as a proxy for PPT content
        const csv = buildCSVFromCases(cases, selectedMetrics);
        downloadFile(csv, `report-${dateSuffix}.csv`, 'text/csv;charset=utf-8;');
        toast.success('Downloaded data file — import into PowerPoint as a table');
      }

    } catch (err) {
      console.error('Report generation error:', err);
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateDownload = async (type: 'performance' | 'country' | 'impact') => {
    setLoading(true);
    try {
      const isAfyanahakiModerator = isModerator && userOrganization === 'Afya na Haki';
      const isRestricted = RESTRICTED_ORGANIZATIONS.includes(userOrganization || '');

      let q = supabase
        .from('cases')
        .select('id, case_filed, status, created_at, client_satisfaction, priority_level, case_categories, partner, countries(name), profiles:user_id(full_name, organization)')
        .eq('moderation_status', 'approved');

      if (!isAfyanahakiModerator && (isRestricted || !isModerator) && currentUserId) {
        q = q.eq('user_id', currentUserId);
      }

      const { data: cases, error } = await q;
      if (error) throw error;

      const dateSuffix = new Date().toISOString().slice(0, 10);

      if (type === 'performance') {
        const completedCases = (cases || []).filter((c: any) => c.status === 'completed');
        const scores = completedCases.filter((c: any) => c.client_satisfaction).map((c: any) => c.client_satisfaction);
        const avgScore = scores.length ? (scores.reduce((s: number, v: number) => s + v, 0) / scores.length).toFixed(2) : 'N/A';

        const rows: [string, unknown][] = [
          ['Total Cases', cases?.length ?? 0],
          ['Completed Cases', completedCases.length],
          ['In Progress', (cases || []).filter((c: any) => c.status === 'in_progress').length],
          ['Pending', (cases || []).filter((c: any) => c.status === 'pending').length],
          ['Avg Client Satisfaction', avgScore],
          ['Success Rate', reportStats.successRate + '%'],
          ['Avg Processing Time (days)', reportStats.avgProcessingTime],
        ];
        const csv = buildSummaryCSV('Performance Summary Report', rows);
        downloadFile(csv, `performance-summary-${dateSuffix}.csv`, 'text/csv;charset=utf-8;');
        toast.success('Performance Summary downloaded');

      } else if (type === 'country') {
        const byCountry: Record<string, number> = {};
        (cases || []).forEach((c: any) => {
          const country = c.countries?.name ?? 'Unknown';
          byCountry[country] = (byCountry[country] || 0) + 1;
        });
        const rows: [string, unknown][] = Object.entries(byCountry).sort((a, b) => (b[1] as number) - (a[1] as number));
        const csv = buildSummaryCSV('Country Analysis Report', [['Country', 'Case Count'], ...rows]);
        downloadFile(csv, `country-analysis-${dateSuffix}.csv`, 'text/csv;charset=utf-8;');
        toast.success('Country Analysis downloaded');

      } else if (type === 'impact') {
        const byCategory: Record<string, number> = {};
        (cases || []).forEach((c: any) => {
          const cats = Array.isArray(c.case_categories) ? c.case_categories : [c.case_categories ?? 'Unclassified'];
          cats.forEach((cat: string) => { byCategory[cat] = (byCategory[cat] || 0) + 1; });
        });
        const rows: [string, unknown][] = [
          ['Total Cases', cases?.length ?? 0],
          ['Avg Processing Time (days)', reportStats.avgProcessingTime],
          ['Success Rate', reportStats.successRate + '%'],
          ['', ''],
          ['Category', 'Count'],
          ...Object.entries(byCategory).sort((a, b) => (b[1] as number) - (a[1] as number)) as [string, unknown][],
        ];
        const csv = buildSummaryCSV('Impact Assessment Report', rows);
        downloadFile(csv, `impact-assessment-${dateSuffix}.csv`, 'text/csv;charset=utf-8;');
        toast.success('Impact Assessment downloaded');
      }

    } catch (err) {
      console.error('Template download error:', err);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleMetricToggle = (metric: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    );
  };

  const handleScheduleReport = () => {
    if (selectedMetrics.length === 0) {
      toast.error('Please select at least one metric');
      return;
    }
    toast.success('Report scheduled successfully');
  };

  return (
    <Card>
      <Title>Report Generation System</Title>
      <Text className="text-stone-500">Create customized reports with selected metrics and visualizations</Text>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Report Templates */}
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="p-4 border border-stone-200 rounded-lg hover:border-primary hover:shadow-md transition-all cursor-pointer"
            onClick={() => handleTemplateDownload('performance')}
          >
            <Flex>
              <div>
                <Text className="font-medium">Performance Summary</Text>
                <Text className="text-stone-500 text-sm">Overall case performance metrics</Text>
              </div>
              <Download className="h-5 w-5 text-primary" />
            </Flex>
            <div className="mt-2 text-xs text-stone-500">
              <div>Total Cases: {reportStats.totalCases}</div>
              <div>Completed: {reportStats.completedCases}</div>
              <div>Success Rate: {reportStats.successRate}%</div>
            </div>
          </div>

          <div
            className="p-4 border border-stone-200 rounded-lg hover:border-primary hover:shadow-md transition-all cursor-pointer"
            onClick={() => handleTemplateDownload('country')}
          >
            <Flex>
              <div>
                <Text className="font-medium">Country Analysis</Text>
                <Text className="text-stone-500 text-sm">Detailed country-by-country breakdown</Text>
              </div>
              <Download className="h-5 w-5 text-primary" />
            </Flex>
            <div className="mt-2 text-xs text-stone-500">
              <div>Countries with cases: {reportStats.totalCases > 0 ? 'Available' : 'None'}</div>
              <div>Regional breakdown: {reportStats.totalCases > 0 ? 'Available' : 'None'}</div>
            </div>
          </div>

          <div
            className="p-4 border border-stone-200 rounded-lg hover:border-primary hover:shadow-md transition-all cursor-pointer"
            onClick={() => handleTemplateDownload('impact')}
          >
            <Flex>
              <div>
                <Text className="font-medium">Impact Assessment</Text>
                <Text className="text-stone-500 text-sm">Comprehensive impact evaluation</Text>
              </div>
              <Download className="h-5 w-5 text-primary" />
            </Flex>
            <div className="mt-2 text-xs text-stone-500">
              <div>Avg. Processing Time: {reportStats.avgProcessingTime} days</div>
              <div>Success Metrics: {reportStats.successRate > 0 ? 'Available' : 'None'}</div>
            </div>
          </div>
        </div>

        {/* Custom Report Builder */}
        <div className="md:col-span-3 p-6 border border-stone-200 rounded-lg">
          <Title>Custom Report Builder</Title>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {/* Metrics Selection */}
            <div>
              <Text className="font-medium mb-3">Select Metrics</Text>
              <div className="space-y-2">
                {[
                  ['case_volume', 'Case Volume'],
                  ['success_rates', 'Success Rates'],
                  ['geographic', 'Geographical Distribution'],
                  ['timeline', 'Timeline Analysis'],
                  ['stakeholders', 'Stakeholder Analysis'],
                  ['legal_framework', 'Legal Framework'],
                ].map(([value, label]) => (
                  <label key={value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.includes(value)}
                      onChange={() => handleMetricToggle(value)}
                      className="rounded border-stone-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Export Format + Date Range */}
            <div>
              <Text className="font-medium mb-3">Export Format</Text>
              <div className="space-y-2">
                {[
                  ['pdf', 'PDF Report'],
                  ['excel', 'Excel Spreadsheet'],
                  ['ppt', 'PowerPoint Presentation'],
                  ['csv', 'CSV Data Export'],
                ].map(([value, label]) => (
                  <label key={value} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="format"
                      value={value}
                      checked={selectedFormat === value}
                      onChange={() => setSelectedFormat(value)}
                      className="border-stone-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>

              <Text className="font-medium mt-6 mb-3">Date Range</Text>
              <div className="space-y-2">
                <div>
                  <Text className="text-sm text-stone-500">Start Date</Text>
                  <input
                    type="date"
                    value={dateRange[0]}
                    onChange={(e) => setDateRange([e.target.value, dateRange[1]])}
                    className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-primary"
                  />
                </div>
                <div>
                  <Text className="text-sm text-stone-500">End Date</Text>
                  <input
                    type="date"
                    value={dateRange[1]}
                    onChange={(e) => setDateRange([dateRange[0], e.target.value])}
                    className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Visualization Options + Actions */}
            <div>
              <Text className="font-medium mb-3">Visualization Options</Text>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-stone-300 text-primary focus:ring-primary" defaultChecked />
                  <span className="text-sm flex items-center">
                    <BarChartHorizontal className="h-4 w-4 mr-1 text-stone-500" />
                    Bar Charts
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-stone-300 text-primary focus:ring-primary" defaultChecked />
                  <span className="text-sm flex items-center">
                    <PieChart className="h-4 w-4 mr-1 text-stone-500" />
                    Pie Charts
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-stone-300 text-primary focus:ring-primary" defaultChecked />
                  <span className="text-sm flex items-center">
                    <FileText className="h-4 w-4 mr-1 text-stone-500" />
                    Data Tables
                  </span>
                </label>
              </div>

              <div className="mt-6">
                <Text className="font-medium mb-3">Delivery Options</Text>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded border-stone-300 text-primary focus:ring-primary" />
                    <span className="text-sm">Email Report</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded border-stone-300 text-primary focus:ring-primary" />
                    <span className="text-sm">Schedule Recurring</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  onClick={handleGenerateReport}
                  disabled={loading || selectedMetrics.length === 0}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </button>
                <button
                  onClick={handleScheduleReport}
                  disabled={loading || selectedMetrics.length === 0}
                  className="px-4 py-2 border border-stone-300 text-stone-700 rounded-md hover:bg-stone-50 flex items-center disabled:opacity-50"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scheduled Reports */}
        <div className="md:col-span-3">
          <Title>Scheduled Reports</Title>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Report Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Frequency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Next Run</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Format</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">Monthly Performance Summary</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">Monthly</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                    {new Date(new Date().setDate(1)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">PDF</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-primary hover:text-primary-dark mr-3">Edit</button>
                    <button className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">Quarterly Impact Report</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">Quarterly</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                    {new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3 + 3, 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">PPT</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-primary hover:text-primary-dark mr-3">Edit</button>
                    <button className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ReportGenerationSystem;
