'use client'

import { ReactNode } from 'react'
import { Building2, Calendar, User, FileText, MapPin } from 'lucide-react'

interface PrintableReportProps {
  title: string
  reportType: string
  dateRange?: string
  preparedBy?: string
  projectCode?: string
  projectName?: string
  children: ReactNode
  showSignatures?: boolean
  confidential?: boolean
}

export function PrintableReport({
  title,
  reportType,
  dateRange,
  preparedBy = 'System Administrator',
  projectCode,
  projectName,
  children,
  showSignatures = true,
  confidential = false
}: PrintableReportProps) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div className="printable-report">
      {/* Print Header - Compact and Professional */}
      <div className="report-header print-show hidden print:block">
        <div className="text-center" style={{ borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '10px' }}>
          <h1 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '0', color: '#000' }}>
            RABAT Engineering
          </h1>
          <p style={{ fontSize: '8pt', margin: '2px 0 0 0', color: '#666' }}>
            Project Management & Construction Services
          </p>
        </div>

        <div style={{ marginBottom: '10px', fontSize: '8pt', lineHeight: '1.4' }}>
          <table style={{ width: '100%', border: '1px solid #000', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 6px', border: '1px solid #000', fontWeight: 'bold', width: '25%', background: '#f5f5f5', fontSize: '8pt' }}>
                  Report Type:
                </td>
                <td style={{ padding: '4px 6px', border: '1px solid #000', fontSize: '8pt' }}>{reportType}</td>
                <td style={{ padding: '4px 6px', border: '1px solid #000', fontWeight: 'bold', width: '20%', background: '#f5f5f5', fontSize: '8pt' }}>
                  Date:
                </td>
                <td style={{ padding: '4px 6px', border: '1px solid #000', fontSize: '8pt' }}>{currentDate}</td>
              </tr>
              {projectCode && (
                <tr>
                  <td style={{ padding: '4px 6px', border: '1px solid #000', fontWeight: 'bold', background: '#f5f5f5', fontSize: '8pt' }}>
                    Project Code:
                  </td>
                  <td style={{ padding: '4px 6px', border: '1px solid #000', fontSize: '8pt' }}>{projectCode}</td>
                  <td style={{ padding: '4px 6px', border: '1px solid #000', fontWeight: 'bold', background: '#f5f5f5', fontSize: '8pt' }}>
                    Project Name:
                  </td>
                  <td style={{ padding: '4px 6px', border: '1px solid #000', fontSize: '8pt' }}>{projectName}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '4px 6px', border: '1px solid #000', fontWeight: 'bold', background: '#f5f5f5', fontSize: '8pt' }}>
                  Prepared By:
                </td>
                <td style={{ padding: '4px 6px', border: '1px solid #000', fontSize: '8pt' }}>{preparedBy}</td>
                <td style={{ padding: '4px 6px', border: '1px solid #000', fontWeight: 'bold', background: '#f5f5f5', fontSize: '8pt' }}>
                  Time:
                </td>
                <td style={{ padding: '4px 6px', border: '1px solid #000', fontSize: '8pt' }}>{currentTime}</td>
              </tr>
              {dateRange && (
                <tr>
                  <td style={{ padding: '4px 6px', border: '1px solid #000', fontWeight: 'bold', background: '#f5f5f5', fontSize: '8pt' }}>
                    Period:
                  </td>
                  <td colSpan={3} style={{ padding: '4px 6px', border: '1px solid #000', fontSize: '8pt' }}>{dateRange}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h2 style={{ fontSize: '11pt', fontWeight: 'bold', textAlign: 'center', margin: '8px 0', color: '#000', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
          {title}
        </h2>
      </div>

      {/* Main Content */}
      <div className="report-content">
        {children}
      </div>

      {/* Signatures Section - Compact Table */}
      {showSignatures && (
        <div className="signatures-section print-show hidden print:block" style={{ marginTop: '30px', pageBreakBefore: 'auto' }}>
          <h3 style={{ fontSize: '10pt', fontWeight: 'bold', marginBottom: '10px', borderBottom: '1px solid #000', paddingBottom: '3px' }}>
            Approvals & Signatures
          </h3>
          
          <table style={{ width: '100%', border: '1px solid #000', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr>
                <th style={{ padding: '5px', border: '1px solid #000', background: '#f5f5f5', fontWeight: 'bold', fontSize: '8pt' }}>
                  Prepared By
                </th>
                <th style={{ padding: '5px', border: '1px solid #000', background: '#f5f5f5', fontWeight: 'bold', fontSize: '8pt' }}>
                  Reviewed By
                </th>
                <th style={{ padding: '5px', border: '1px solid #000', background: '#f5f5f5', fontWeight: 'bold', fontSize: '8pt' }}>
                  Approved By
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '20px 8px', border: '1px solid #000', textAlign: 'center', height: '50px' }}>
                  {/* Signature space */}
                </td>
                <td style={{ padding: '20px 8px', border: '1px solid #000', textAlign: 'center', height: '50px' }}>
                  {/* Signature space */}
                </td>
                <td style={{ padding: '20px 8px', border: '1px solid #000', textAlign: 'center', height: '50px' }}>
                  {/* Signature space */}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '5px', border: '1px solid #000', fontSize: '7pt', lineHeight: '1.4' }}>
                  <div><strong>Name:</strong> {preparedBy}</div>
                  <div style={{ marginTop: '3px' }}><strong>Title:</strong> Engineer</div>
                  <div style={{ marginTop: '3px' }}><strong>Date:</strong> __________</div>
                </td>
                <td style={{ padding: '5px', border: '1px solid #000', fontSize: '7pt', lineHeight: '1.4' }}>
                  <div><strong>Name:</strong> __________</div>
                  <div style={{ marginTop: '3px' }}><strong>Title:</strong> PM</div>
                  <div style={{ marginTop: '3px' }}><strong>Date:</strong> __________</div>
                </td>
                <td style={{ padding: '5px', border: '1px solid #000', fontSize: '7pt', lineHeight: '1.4' }}>
                  <div><strong>Name:</strong> __________</div>
                  <div style={{ marginTop: '3px' }}><strong>Title:</strong> Director</div>
                  <div style={{ marginTop: '3px' }}><strong>Date:</strong> __________</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Print Footer - Compact */}
      <div className="report-footer print-show hidden print:block" style={{ position: 'fixed', bottom: '0', left: '0', right: '0', padding: '5px 1.5cm', borderTop: '1px solid #000', fontSize: '7pt', color: '#666', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>RABAT Engineering © {new Date().getFullYear()}</span>
          <span>{currentDate} {currentTime}</span>
        </div>
      </div>
    </div>
  )
}

export default PrintableReport

