import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Download, FileText, Eye, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import UploadLawModal from './UploadLawModal';

// Pre-defined documents for all countries
const PREDEFINED_DOCUMENTS = {
  'Ivory Coast': [
    {
      id: 'code-of-ethics',
      title: 'Code of Ethics and Deontology for Practitioners of Traditional Medicine',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Ivory%20Coast/Code-of-Ethics-and-Deontology-for-practitioners-of-traditional-medicine-and-pharmacopoeia-in-Cote-dIvoire.pdf',
      type: 'act',
      category: 'healthcare'
    },
    {
      id: 'constitution',
      title: 'Constitution of Côte d\'Ivoire',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Ivory%20Coast/Cote-DIvoire-Constitution.pdf',
      type: 'act',
      category: 'constitutional-law'
    },
    {
      id: 'fgm-law',
      title: 'Law Prohibiting Female Genital Mutilation',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Ivory%20Coast/Law-prohibiting-the-practice-of-female-genital-mutilation-in-Cote-dIvoire.pdf',
      type: 'act',
      category: 'criminal-law'
    },
    {
      id: 'penal-code',
      title: 'Penal Code of Côte d\'Ivoire',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Ivory%20Coast/Penal-Code-of-Cote-dIvoire.pdf',
      type: 'act',
      category: 'criminal-law'
    },
    {
      id: 'public-health',
      title: 'Public Health Code',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Ivory%20Coast/Public-Health-Code-Cote-dIvoire.pdf',
      type: 'act',
      category: 'healthcare'
    }
  ],
  'Kenya': [
    {
      id: 'adolescent-health-policy',
      title: 'Adolescent Reproductive Health and Development Policy Plan (2005-2015)',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Kenya/Policies/Adolescent-Reproductive-Health-and-Development-Policy-Plan-of-Action-2005-2015.pdf',
      type: 'policy',
      category: 'healthcare'
    },
    {
      id: 'community-health',
      title: 'Community Health Volunteers Family Planning Facilitators Guide',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Kenya/Policies/Community-Health-Volunteers-Family-Planning-Facilitators-Guide.pdf',
      type: 'policy',
      category: 'healthcare'
    },
    {
      id: 'family-planning',
      title: 'Family Planning Guidelines for Service Providers (2010)',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Kenya/Policies/Family-Planning-Guidelines-for-Service-Providers-2010.pdf',
      type: 'policy',
      category: 'healthcare'
    },
    {
      id: 'reproductive-health',
      title: 'Integrating STI/RTI into Reproductive Health Services',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Kenya/Policies/Integrating-STI-RTI-into-Reproductive-Health-services-Handbook-for-Service-Providers.pdf',
      type: 'policy',
      category: 'healthcare'
    },
    {
      id: 'adolescent-policy',
      title: 'Kenya Adolescent Reproductive Health and Development Policy',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Kenya/Policies/Kenya-Adolescent-Reproductive-Health-and-Development-Policy.pdf',
      type: 'policy',
      category: 'healthcare'
    },
    {
      id: 'implementation-guidelines',
      title: 'Kenya Implementation Guidelines (2010-2012)',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Kenya/Policies/Kenya-Implementation-Guidelines-2010-2012.pdf',
      type: 'policy',
      category: 'healthcare'
    },
    {
      id: 'sexuality-curriculum',
      title: 'National Curriculum on Sexuality and Sexual Health Training',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Kenya/Policies/National-Curriculum-on-Sexuality-and-Sexual-Health-Training-for-Providers.pdf',
      type: 'policy',
      category: 'education'
    },
    {
      id: 'rti-guidelines',
      title: 'National Guidelines for Reproductive Tract Infection Services',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Kenya/Policies/National-Guidelines-for-Reproductive-Tract-Infection-Services.pdf',
      type: 'policy',
      category: 'healthcare'
    },
    {
      id: 'sexual-violence',
      title: 'National Guidelines on Management of Sexual Violence (2009)',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Kenya/Policies/National-Guidelines-on-Management-of-Sexual-Violence-in-Kenya-2009.pdf',
      type: 'policy',
      category: 'healthcare'
    },
    {
      id: 'reproductive-health-policy-2022',
      title: 'The National Reproductive Health Policy (2022-2032)',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Kenya/Policies/The-National-Reproductive-Health-Policy2022-2032.pdf',
      type: 'policy',
      category: 'healthcare'
    },
    {
      id: 'penal-code',
      title: 'Penal Code',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Kenya/Policies/Penal-Code.pdf',
      type: 'act',
      category: 'criminal-law'
    },
    {
      id: 'children-act',
      title: 'The Children Act',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Kenya/Policies/The-Children-Act.pdf',
      type: 'act',
      category: 'family-law'
    },
    {
      id: 'health-act',
      title: 'The Health Act',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Kenya/Policies/The-Health-Act.pdf',
      type: 'act',
      category: 'healthcare'
    }
  ],
  'Madagascar': [
    {
      id: 'constitution',
      title: 'Constitution of Madagascar',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Madagascar/constitution-of-Madagascar.pdf',
      type: 'act',
      category: 'constitutional-law'
    },
    {
      id: 'health-code',
      title: 'Law No. 2011-002 Relating to the Health Code',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Madagascar/Law-No.-2011-002-Relating-to-the-Health-Code.pdf',
      type: 'act',
      category: 'healthcare'
    },
    {
      id: 'marriage-law',
      title: 'Law Relating to Marriage and Matrimonial Regimes',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Madagascar/Madagascar-Law-Relating-to-Marriage-and-Matrimonial-Regimes.pdf',
      type: 'act',
      category: 'family-law'
    }
  ],
  'Malawi': {
    acts: [
      {
        id: 'disability-act',
        title: 'Disability Act',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Malawi/Acts/Disability-Act.pdf',
        type: 'act',
        category: 'human-rights'
      },
      {
        id: 'gender-equality',
        title: 'Gender Equality Act',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Malawi/Acts/Gender-Equality-Act.pdf',
        type: 'act',
        category: 'human-rights'
      },
      {
        id: 'penal-code-amendment',
        title: 'Penal Code Amendment Act 2023',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Malawi/Acts/Penal-Code-Amendment-Act-2023.pdf',
        type: 'act',
        category: 'criminal-law'
      },
      {
        id: 'constitution',
        title: 'Republic of Malawi Constitution Act',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Malawi/Acts/Republic-of-Malawi-Constitution-Act.pdf',
        type: 'act',
        category: 'constitutional-law'
      },
      {
        id: 'termination-pregnancy',
        title: 'Termination of Pregnancy Bill',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Malawi/Acts/termination-of-pregnancy-bill.pdf',
        type: 'act',
        category: 'healthcare'
      },
      {
        id: 'penal-code',
        title: 'The Penal Code',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Malawi/Acts/The-Penal-Code.pdf',
        type: 'act',
        category: 'criminal-law'
      },
      {
        id: 'trafficking',
        title: 'Trafficking in Persons Act',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Malawi/Acts/Trafficking-in-Persons-Act.pdf',
        type: 'act',
        category: 'criminal-law'
      }
    ],
    policies: [
      {
        id: 'reproductive-health-guidelines',
        title: 'National Reproductive Health Service Delivery Guidelines (2014-2019)',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Malawi/Policies/Malawi-National-Reproductive-Health-Service-Delivery-Guidelines-2014-2019.pdf',
        type: 'policy',
        category: 'healthcare'
      },
      {
        id: 'srhr-policy-2017',
        title: 'National Sexual and Reproductive Health and Rights Policy (2017-2022)',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Malawi/Policies/Malawi-National-Sexual-and-Reproductive-Health-and-Rights-SRHR-Policy-2017-2022.pdf',
        type: 'policy',
        category: 'healthcare'
      },
      {
        id: 'srhr-strategy-2021',
        title: 'National Sexual and Reproductive Health and Rights Strategy (2021-2025)',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Malawi/Policies/Malawi-National-Sexual-and-Reproductive-Health-and-Rights-Strategy-2021-2025.pdf',
        type: 'policy',
        category: 'healthcare'
      },
      {
        id: 'reproductive-health-policy',
        title: 'Reproductive Health Policy',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Malawi/Policies/Malawi-Reproductive-Health-Policy.pdf',
        type: 'policy',
        category: 'healthcare'
      }
    ]
  },
  'Nigeria': {
    acts: [
      {
        id: 'criminal-code',
        title: 'Criminal Code Act',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Nigeria/Acts/Criminal-Code-Act-Nigeria.pdf',
        type: 'act',
        category: 'criminal-law'
      },
      {
        id: 'penal-code',
        title: 'Penal Code Act (1960)',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Nigeria/Acts/Penal-Code-Act-1960.pdf',
        type: 'act',
        category: 'criminal-law'
      }
    ],
    policies: [
      {
        id: 'adolescent-health',
        title: 'National Adolescent Health Policy',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Nigeria/Policies/National-Adolescent-Health-Policy.pdf',
        type: 'policy',
        category: 'healthcare'
      },
      {
        id: 'health-policy',
        title: 'National Health Policy',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Nigeria/Policies/National-Health-Policy.pdf',
        type: 'policy',
        category: 'healthcare'
      },
      {
        id: 'self-care',
        title: 'Nigeria Self-Care Guideline Summary',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Nigeria/Policies/Nigeria-Self-Care-Guideline-Summary.pdf',
        type: 'policy',
        category: 'healthcare'
      }
    ]
  },
  'Senegal': {
    acts: [
      {
        id: 'penal-code',
        title: 'Code Pénal',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Senegal/acts/Code-Penal.pdf',
        type: 'act',
        category: 'criminal-law'
      }
    ],
    policies: [
      {
        id: 'population-policy',
        title: 'Declaration Nationale de Politique de Population (2005)',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Senegal/policies/Declaration-Nationale-de-Politique-de-Population-2005.pdf',
        type: 'policy',
        category: 'population'
      }
    ]
  },
  'South Africa': [
    {
      id: 'termination-pregnancy',
      title: 'Choice on Termination of Pregnancy Act',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/South%20Africa/Acts/92_of_1996_choice_on_termination_of_pregnancy_act_regs_gnr_168.pdf',
      type: 'act',
      category: 'healthcare'
    },
    {
      id: 'health-act',
      title: 'National Health Act',
      url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/South%20Africa/Acts/National-Health-Act-SA.pdf',
      type: 'act',
      category: 'healthcare'
    }
  ],
  'Uganda': {
    acts: [
      {
        id: 'data-protection',
        title: 'Data Protection and Privacy Act (2019)',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Uganda/Acts/Data-Protection-and-Privacy-Act-2019-Uganda.pdf',
        type: 'act',
        category: 'privacy'
      },
      {
        id: 'penal-code',
        title: 'Penal Code Act',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Uganda/Acts/Penal-Code-Act.pdf',
        type: 'act',
        category: 'criminal-law'
      },
      {
        id: 'constitution',
        title: 'Constitution of 1995 with Amendments',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Uganda/Acts/Ugandas-Constitution-of-1995-with-Amendments.pdf',
        type: 'act',
        category: 'constitutional-law'
      }
    ],
    policies: [
      {
        id: 'adolescent-health',
        title: 'National Adolescent Health Policy',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Uganda/Policies/National-Adolescent-Health-Policy-for-Uganda.pdf',
        type: 'policy',
        category: 'healthcare'
      },
      {
        id: 'gender-violence',
        title: 'National Policy on Elimination of Gender-Based Violence',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Uganda/Policies/National-Policy-on-Elimination-of-Gender-Based-Violence-in-Uganda.pdf',
        type: 'policy',
        category: 'gender'
      },
      {
        id: 'training-curriculum',
        title: 'National Training Curriculum for Health Workers on Adolescent Health',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Uganda/Policies/National-Training-Curriculum-for-Health-Workers-on-Adolescent-Health-and-Development-Trainee-Handbook.pdf',
        type: 'policy',
        category: 'healthcare'
      },
      {
        id: 'reproductive-health',
        title: 'National Policy Guidelines for Sexual and Reproductive Health',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Uganda/Policies/The-National-Policy-Guidelines-and-Service-Standards-for-Sexual-and-Reproductive-Health-and-Rights.pdf',
        type: 'policy',
        category: 'healthcare'
      }
    ]
  },
  'Zimbabwe': {
    acts: [
      {
        id: 'constitution',
        title: 'Constitution Amendment No. 20 Act (2013)',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Zimbabwe/Acts/Constitution-of-Zimbabwe-Amendment-No.-20-Act-2013.pdf',
        type: 'act',
        category: 'constitutional-law'
      },
      {
        id: 'criminal-law',
        title: 'Criminal Law Codification and Reform Act',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Zimbabwe/Acts/Criminal-Law-Codification-and-Reform-Act.pdf',
        type: 'act',
        category: 'criminal-law'
      },
      {
        id: 'termination-pregnancy',
        title: 'Termination of Pregnancy Act',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Zimbabwe/Acts/Termination-of-Pregnancy-Act.pdf',
        type: 'act',
        category: 'healthcare'
      },
      {
        id: 'family-planning',
        title: 'Zimbabwe National Family Planning Council Act',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Zimbabwe/Acts/Zimbabwe-National-Family-Planning-Council-Act.pdf',
        type: 'act',
        category: 'healthcare'
      }
    ],
    policies: [
      {
        id: 'essential-medicines',
        title: '6th Essential Medicines List and Treatment Guidelines',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Zimbabwe/Policies/6th-Essential-Medicines-List-Standard-Treatment-Guidelines-for-Zimbabwe.pdf',
        type: 'policy',
        category: 'healthcare'
      },
      {
        id: 'family-planning-guidelines',
        title: 'Family Planning Guidelines (2018)',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Zimbabwe/Policies/Family-Planning-Guidelines-for-Zimbabwe-2018.pdf',
        type: 'policy',
        category: 'healthcare'
      },
      {
        id: 'abortion-care',
        title: 'National Guidelines for Comprehensive Abortion Care',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Zimbabwe/Policies/National-Guidelines-for-Comprehensive-Abortion-Care-in-Zimbabwe.pdf',
        type: 'policy',
        category: 'healthcare'
      },
      {
        id: 'post-abortion',
        title: 'National Guidelines for Post-Abortion Care',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Zimbabwe/Policies/National-Guidelines-for-Post-Abortion-Care-in-Zimbabwe.pdf',
        type: 'policy',
        category: 'healthcare'
      },
      {
        id: 'maternal-health',
        title: 'National Maternal and Neonatal Health Road Map (2007-2015)',
        url: 'https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/public/laws/Zimbabwe/Policies/The-Zimbabwe-National-Maternal-and-Neonatal-Health-Road-Map-2007-2015.pdf',
        type: 'policy',
        category: 'healthcare'
      }
    ]
  }
};

const LawsRepository = () => {
  const { t } = useTranslation();
  const [documents, setDocuments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCountry, setSelectedCountry] = React.useState<string>('');
  const [selectedType, setSelectedType] = React.useState<'policy' | 'act' | ''>('');
  const [showUploadModal, setShowUploadModal] = React.useState(false);

  React.useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('law_documents')
        .select(`
          *,
          countries (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (url: string) => {
    window.open(url, '_blank');
  };

  const handleDownload = (url: string, title: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">Legal Documents</h2>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        {/* Search and Filters */}
        <div className="p-4 border-b">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">All Countries</option>
              {Object.keys(PREDEFINED_DOCUMENTS).map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'policy' | 'act' | '')}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">All Types</option>
              <option value="policy">Policies</option>
              <option value="act">Acts</option>
            </select>
          </div>
        </div>

        {/* Documents Display */}
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : Object.entries(PREDEFINED_DOCUMENTS)
              .filter(([country]) => !selectedCountry || country === selectedCountry)
              .map(([country, docs]) => {
                const documents = Array.isArray(docs) ? docs : [...docs.acts, ...docs.policies];
                const filteredDocs = documents.filter(doc => 
                  (!selectedType || doc.type === selectedType) &&
                  (!searchTerm || doc.title.toLowerCase().includes(searchTerm.toLowerCase()))
                );

                if (filteredDocs.length === 0) return null;

                return (
                  <div key={country} className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{country}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredDocs.map(doc => (
                        <div key={doc.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                          <div className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 mb-2">
                                  {doc.type === 'act' ? 'Act' : 'Policy'}
                                </span>
                                <h4 className="text-md font-medium text-gray-900 mb-2">{doc.title}</h4>
                                <p className="text-sm text-gray-500 mb-4">{doc.category}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleViewDocument(doc.url)}
                                className="flex items-center space-x-1 text-sm text-primary hover:text-primary-dark"
                              >
                                <Eye className="h-4 w-4" />
                                <span>View</span>
                              </button>
                              <button
                                onClick={() => handleDownload(doc.url, doc.title)}
                                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
                              >
                                <Download className="h-4 w-4" />
                                <span>Download</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }).filter(Boolean).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No documents found matching your criteria
            </div>
          ) : (
            Object.entries(PREDEFINED_DOCUMENTS)
              .filter(([country]) => !selectedCountry || country === selectedCountry)
              .map(([country, docs]) => {
                const documents = Array.isArray(docs) ? docs : [...docs.acts, ...docs.policies];
                const filteredDocs = documents.filter(doc => 
                  (!selectedType || doc.type === selectedType) &&
                  (!searchTerm || doc.title.toLowerCase().includes(searchTerm.toLowerCase()))
                );

                if (filteredDocs.length === 0) return null;

                return (
                  <div key={country} className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{country}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredDocs.map(doc => (
                        <div key={doc.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                          <div className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 mb-2">
                                  {doc.type === 'act' ? 'Act' : 'Policy'}
                                </span>
                                <h4 className="text-md font-medium text-gray-900 mb-2">{doc.title}</h4>
                                <p className="text-sm text-gray-500 mb-4">{doc.category}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleViewDocument(doc.url)}
                                className="flex items-center space-x-1 text-sm text-primary hover:text-primary-dark"
                              >
                                <Eye className="h-4 w-4" />
                                <span>View</span>
                              </button>
                              <button
                                onClick={() => handleDownload(doc.url, doc.title)}
                                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
                              >
                                <Download className="h-4 w-4" />
                                <span>Download</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }).filter(Boolean)
          )}
        </div>
      </div>

      {showUploadModal && (
        <UploadLawModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchDocuments();
          }}
        />
      )}
    </div>
  );
};

export default LawsRepository;