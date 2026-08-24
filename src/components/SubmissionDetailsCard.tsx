import React from 'react';
import { FileText, User, Building, Calendar, MapPin } from 'lucide-react';

interface SubmissionDetailsCardProps {
  submission: any;
  showDocument?: boolean;
  onViewDocument?: () => void;
}

const SubmissionDetailsCard: React.FC<SubmissionDetailsCardProps> = ({ 
  submission, 
  showDocument = true,
  onViewDocument 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-medium text-gray-900">
              {submission.title || submission.case_filed}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {submission.type || 'submission'}
            </span>
          </div>
          
          <div className="mt-3 space-y-2">
            {/* Submitter Information */}
            <div className="flex items-start space-x-2 text-sm text-gray-600">
              <User className="h-4 w-4 mt-0.5 text-gray-400" />
              <div>
                <p className="font-medium">Submitted by:</p>
                <p>{submission.profiles?.email || submission.users?.email || 'Unknown'}</p>
                <p>{submission.profiles?.full_name || submission.users?.raw_user_meta_data?.full_name || 'Unknown'}</p>
                {(submission.profiles?.profession || submission.users?.raw_user_meta_data?.profession) && (
                  <p className="text-gray-500">
                    {submission.profiles?.profession || submission.users?.raw_user_meta_data?.profession}
                  </p>
                )}
              </div>
            </div>
            
            {/* Organization Information */}
            {(submission.profiles?.organization || submission.users?.raw_user_meta_data?.organization) && (
              <div className="flex items-start space-x-2 text-sm text-gray-600">
                <Building className="h-4 w-4 mt-0.5 text-gray-400" />
                <div>
                  <p className="font-medium">Organization:</p>
                  <p>{submission.profiles?.organization || submission.users?.raw_user_meta_data?.organization}</p>
                </div>
              </div>
            )}
            
            {/* Date Information */}
            <div className="flex items-start space-x-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4 mt-0.5 text-gray-400" />
              <div>
                <p className="font-medium">Submission Date:</p>
                <p>{new Date(submission.created_at || submission.submission_date).toLocaleDateString()}</p>
              </div>
            </div>
            
            {/* Country Information */}
            {submission.countries?.name && (
              <div className="flex items-start space-x-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 mt-0.5 text-gray-400" />
                <div>
                  <p className="font-medium">Country:</p>
                  <p>{submission.countries.name}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Summary */}
          {(submission.case_summary || submission.summary) && (
            <div className="mt-4">
              <p className="text-sm text-gray-700 line-clamp-3">{submission.case_summary || submission.summary}</p>
            </div>
          )}
          
          {/* Categories */}
          {submission.case_categories && submission.case_categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {submission.case_categories.map((category: string, idx: number) => (
                <span 
                  key={idx}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {category}
                </span>
              ))}
            </div>
          )}
          
          {/* Document Link */}
          {showDocument && (submission.document_url || submission.file_url || submission.pdf_url) && (
            <div className="mt-4">
              <button
                onClick={onViewDocument}
                className="inline-flex items-center text-sm text-primary hover:text-primary-dark"
              >
                <FileText className="h-4 w-4 mr-1" />
                View Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetailsCard;