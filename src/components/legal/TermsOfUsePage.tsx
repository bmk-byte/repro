import { PublicScorecardChrome } from '../../scorecard/components/PublicScorecardChrome';
import { LegalPageLayout, Placeholder, Callout, type LegalSection } from './LegalPageLayout';

const P = ({ children }: { children: React.ReactNode }) => <p>{children}</p>;
const UL = ({ children }: { children: React.ReactNode }) => (
  <ul className="list-disc pl-5 space-y-1.5">{children}</ul>
);

const sections: LegalSection[] = [
  {
    id: 'introduction',
    title: 'Introduction and Acceptance',
    content: (
      <>
        <P>
          ReproPulse ("the Platform") is operated by ReproPulse, part of Afya na Haki's LIRA
          Programme (together, "Afya na Haki," "we," "us," or "our"), registered at Plot 6105
          Valley Road, Canaan Sites, Nakwero, Uganda.
          ReproPulse tracks reproductive-rights litigation, judgments, and legal frameworks
          across African countries on behalf of a coalition of partner organizations, and
          publishes an aggregate, country-level Maputo Protocol Scorecard that anyone can
          view without an account.
        </P>
        <P>
          These Terms of Use ("Terms") govern access to and use of ReproPulse, including the
          public Scorecard pages and every feature available to signed-in users (Dashboard,
          Cases, Judgments, Laws, Resources, Analytics, Rapid Response, Moderation, Settings,
          and the Admin panel). By creating an account, signing in, or using any part of the
          Platform, you agree to be bound by these Terms. If you do not agree, do not use the
          Platform.
        </P>
        <P>
          If you are registering on behalf of a partner organization, you confirm that you
          are authorized to act on that organization's behalf and to agree to these Terms for
          it, and that the organization itself is bound by them.
        </P>
      </>
    ),
  },
  {
    id: 'definitions',
    title: 'Definitions and Interpretation',
    content: (
      <>
        <UL>
          <li><strong>"Partner Organization"</strong> means a non-governmental or civil-society organization affiliated with the Afya na Haki coalition whose staff hold accounts on the Platform.</li>
          <li><strong>"Account Holder"</strong> or <strong>"you"</strong> means an individual signed-in user, acting as a representative of a Partner Organization unless they hold a Moderator, Admin, or Scorecard Editor role granted directly by an Admin.</li>
          <li><strong>"Case Record"</strong> and <strong>"Judgment Record"</strong> mean the litigation and judgment data submitted, reviewed, and published through the Platform, including any attached documents.</li>
          <li><strong>"Case Subject"</strong> means a litigant, client, defendant, witness, or other named individual described within a Case Record, Judgment Record, or attached document — a real person whose data appears in Platform content but who does not themselves hold a Platform account.</li>
          <li><strong>"Moderator"</strong> means an Account Holder granted rights to review, approve, or reject submissions, and to upload Case Records directly without review.</li>
          <li><strong>"Admin"</strong> means an Account Holder granted full platform administration rights, including granting and revoking Moderator, Admin, and Scorecard Editor access.</li>
          <li><strong>"Scorecard Editor"</strong> means an Account Holder granted rights to score and publish Maputo Protocol Scorecard assessments — a role independent of the Moderator/Admin hierarchy.</li>
          <li><strong>"Service Providers"</strong> means the third-party infrastructure providers the Platform relies on to operate, described in Section 13.</li>
        </UL>
      </>
    ),
  },
  {
    id: 'eligibility',
    title: 'Eligibility and Authority to Enter Into Agreements',
    content: (
      <P>
        You must be at least 18 years old and have the legal capacity to enter into binding
        agreements to create an Account. By registering, you represent that the information
        you provide (including your organization) is accurate, and that you hold, or will
        promptly obtain, any authorization your organization requires for you to submit case
        and judgment data on its behalf. The Platform does not independently verify an
        applicant's employment or authority within the organization they select at
        registration; Partner Organizations are responsible for promptly notifying{' '}
        <a href="mailto:itsupport@afyanahaki.org" className="text-primary hover:underline">itsupport@afyanahaki.org</a> if
        someone registers under their name without authorization.
      </P>
    ),
  },
  {
    id: 'description',
    title: 'Description of the Platform and Its Services',
    content: (
      <>
        <P>The Platform provides:</P>
        <UL>
          <li>A shared database of reproductive-rights litigation cases and judgments across participating African countries, searchable and filterable by signed-in users.</li>
          <li>Submission tools for individual and bulk (CSV) case/judgment intake, subject to moderator review unless submitted via direct upload by a Moderator or Admin.</li>
          <li>Rapid Response tracking for time-sensitive cases, available to Moderators and Admins.</li>
          <li>A Laws repository and a Resources library of templates, guides, and research materials.</li>
          <li>Analytics dashboards summarizing case trends, distribution, geography, and outcomes across the dataset.</li>
          <li>The public Maputo Protocol Scorecard, measuring country alignment with Article 14(2)(c) of the Protocol, based on published assessments only.</li>
        </UL>
        <P>
          The Platform is provided to support litigation tracking, legal advocacy, and research
          by and among Partner Organizations. It is not a case management system of record for
          any individual legal matter, and does not replace a Partner Organization's own client
          files, case management software, or professional obligations to the people it
          represents.
        </P>
      </>
    ),
  },
  {
    id: 'account-security',
    title: 'Account Registration, Authentication, and Account Security',
    content: (
      <>
        <P>
          Accounts are created with an email address, password, full name, profession, phone
          number, and organization. Authentication is handled by our backend provider
          (Supabase Auth); we do not store your password in readable form.
        </P>
        <P>
          You are responsible for maintaining the confidentiality of your credentials and for
          all activity under your Account. Notify{' '}
          <a href="mailto:info@afyanahaki.org" className="text-primary hover:underline">info@afyanahaki.org</a>{' '}
          immediately if you suspect unauthorized access. We may suspend an Account showing
          signs of compromise pending investigation.
        </P>
      </>
    ),
  },
  {
    id: 'partner-onboarding',
    title: 'Partner Organization Onboarding and Responsibilities',
    content: (
      <>
        <P>
          Each Partner Organization is responsible for the conduct of its own staff on the
          Platform, including the accuracy of case and judgment data they submit and their
          own legal basis for processing any Case Subject's personal data before submitting
          it to the Platform (see Section 19).
        </P>
        <P>
          Where a Partner Organization represents, advises, or otherwise acts for a Case
          Subject, that Partner Organization — not Afya na Haki — is responsible for obtaining
          whatever consent, authorization, or other lawful basis is required under applicable
          law before recording that person's case in a shared, cross-organizational database.
          Afya na Haki recommends Partner Organizations maintain their own records evidencing
          that basis, separate from the Platform.
        </P>
      </>
    ),
  },
  {
    id: 'submitting-data',
    title: 'Submitting Case, Judgment, and Rapid Response Data',
    content: (
      <>
        <P>
          When you submit a case, judgment, or rapid response record — individually or via
          bulk CSV upload — you are submitting data that may include the names, contact
          details, and sensitive circumstances (including health, reproductive-health,
          sexual-violence, or criminal-matter details) of real Case Subjects who are not
          Platform users and have not agreed to these Terms.
        </P>
        <Callout title="Your responsibility before you submit">
          You confirm that you have a lawful basis to record this person's data in a shared
          database used by multiple organizations, that you have considered whether the
          submission could place the Case Subject (particularly a minor, a survivor of
          gender-based violence, or a person in a jurisdiction criminalizing the conduct
          described) at risk, and that the submission is limited to what is necessary for the
          Platform's litigation-tracking and advocacy purpose.
        </Callout>
        <P>
          Attached PDF documents are stored as uploaded; the Platform does not scan, redact,
          or otherwise alter their contents. Do not attach a document containing information
          beyond what is necessary for the case record, or containing a Case Subject's full
          unredacted personal identifiers where a Partner Organization's own professional or
          ethical obligations would call for redaction.
        </P>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use and Prohibited Activities',
    content: (
      <>
        <P>You must not use the Platform to:</P>
        <UL>
          <li>Submit false, fabricated, or materially misleading case or judgment information.</li>
          <li>Submit a Case Subject's data without the basis described in Sections 7 and 19.</li>
          <li>Access, or attempt to access, another user's account, another organization's draft submissions, or data you are not authorized to view.</li>
          <li>Upload malware, attempt to probe or bypass access controls, or interfere with the Platform's availability.</li>
          <li>Use bulk upload, scraping, or automated tools to extract Case Subject data at scale for a purpose unrelated to the Platform's litigation-tracking and advocacy purpose.</li>
          <li>Use the Platform to harass, intimidate, or expose a Case Subject, or for any purpose that could endanger a Case Subject's safety.</li>
        </UL>
      </>
    ),
  },
  {
    id: 'data-ownership',
    title: 'Case Subject Data: Access and Permitted Use',
    content: (
      <>
        <P>
          Afya na Haki does not claim ownership of the substantive content of Case Records or
          Judgment Records (the facts of a case, a judgment's text, or a Case Subject's
          personal data within them). The submitting Partner Organization — and, in the case
          of judgments, the originating court — remain the source of that content.
        </P>
        <P>
          By submitting a record, you grant Afya na Haki and other Platform users the rights
          described in Section 10 to store, display, and make it searchable within the
          Platform for the coalition's shared litigation-tracking purpose, and you grant Afya
          na Haki the right to include aggregated, country-level figures derived from it in
          the public Scorecard and Analytics features.
        </P>
      </>
    ),
  },
  {
    id: 'platform-wide-visibility',
    title: 'Platform-Wide Visibility of Published Records',
    content: (
      <>
        <P>
          A submission you make through the regular Submit Case or Submit Judgment flow is
          visible only to you and to Moderators/Admins while it awaits review. Once a
          Moderator approves it — or a Moderator/Admin uploads a case directly — the record
          becomes visible to <strong>every signed-in user on the Platform, across all Partner
          Organizations</strong>, not only to the organization that submitted it. This
          reflects the Platform's purpose: a shared, cross-organizational view of
          reproductive-rights litigation for coordinated advocacy.
        </P>
        <P>
          Published judgment records are additionally visible to any authenticated user; they
          are not restricted by Partner Organization. If your organization needs a case or
          judgment withheld from general platform visibility for a Case Subject's safety,
          contact a Moderator or Admin before submitting it, or submit it outside the
          Platform through your organization's own channels instead.
        </P>
      </>
    ),
  },
  {
    id: 'moderation',
    title: 'Moderation and Review of Submissions',
    content: (
      <P>
        Submissions made through the standard (non-direct-upload) flow are reviewed by a
        Moderator before publication. A Moderator may approve, reject, or request changes to a
        submission. Rejecting a submission does not create a public Case or Judgment Record.
        Moderators and Admins may also upload Case Records directly, bypassing review, and
        are responsible for the accuracy of what they upload that way.
      </P>
    ),
  },
  {
    id: 'notifications',
    title: 'Automated Features: Drafts, Notifications, and Emails',
    content: (
      <>
        <P>
          The Platform auto-saves in-progress submission drafts to your browser's local
          storage so you can resume later, and sends transactional emails (submission
          received, approval/rejection decisions, new-submission alerts to Moderators) via our
          email provider. These are operational notices, not marketing communications — the
          Platform does not send promotional or marketing messages, and does not use SMS.
        </P>
      </>
    ),
  },
  {
    id: 'third-party-services',
    title: 'Third-Party Integrations and Services',
    content: (
      <>
        <P>The Platform relies on the following categories of third-party Service Providers to operate:</P>
        <UL>
          <li>Database, authentication, file storage, and backend functions — Supabase.</li>
          <li>Web application hosting — Vercel.</li>
          <li>Transactional email delivery — Resend.</li>
          <li>Optional error monitoring (enabled only in certain environments) — <Placeholder>[ERROR MONITORING PROVIDER]</Placeholder> (Sentry).</li>
        </UL>
        <P>
          We do not use SMS providers, payment processors, or advertising/analytics trackers.
          See the Privacy Policy, Section 14, for how these providers handle data.
        </P>
      </>
    ),
  },
  {
    id: 'fees',
    title: 'No Fees for Platform Access',
    content: (
      <P>
        Access to ReproPulse is provided to Partner Organizations at no charge as part of the
        Afya na Haki LIRA Programme coalition. We do not currently charge subscription fees,
        and these Terms do not include billing, renewal, or refund provisions because none
        apply today. If that changes, we will update these Terms and notify Account Holders
        before any charge takes effect.
      </P>
    ),
  },
  {
    id: 'availability',
    title: 'Platform Availability, Maintenance, and Changes',
    content: (
      <P>
        We aim to keep the Platform available but do not guarantee uninterrupted access. We
        may perform maintenance, modify, add, or remove features at any time, including
        features described in this document, with or without notice, though we will try to
        give advance notice of material changes affecting core functionality.
      </P>
    ),
  },
  {
    id: 'ip',
    title: 'Intellectual Property Rights',
    content: (
      <P>
        The Platform's software, design, branding, and the Afya na Haki name and marks are
        owned by ReproPulse or its licensors. You receive
        a limited, non-exclusive, non-transferable license to use the Platform in accordance
        with these Terms. Nothing here transfers ownership of Afya na Haki's intellectual
        property to you or your organization.
      </P>
    ),
  },
  {
    id: 'user-content',
    title: 'User-Generated Content and Uploaded Documents',
    content: (
      <P>
        You retain whatever rights you held in a document before uploading it (for example, a
        litigation filing your organization authored). You represent that you have the right
        to upload each document and that doing so does not infringe a third party's copyright
        or violate a duty of confidentiality you owe to a Case Subject or a court.
      </P>
    ),
  },
  {
    id: 'confidentiality',
    title: 'Confidentiality and Information Security',
    content: (
      <P>
        We apply reasonable technical and organizational measures described in the Privacy
        Policy, Section 17, to protect Platform data. You must not share your credentials,
        and must take reasonable care to avoid exposing a Case Subject's data outside the
        Platform (for example, by exporting it to an unsecured device or sharing a document
        containing it over an unencrypted channel).
      </P>
    ),
  },
  {
    id: 'data-protection-roles',
    title: 'Data Protection Responsibilities',
    content: (
      <P>
        Section 19 of the Privacy Policy explains, in detail, how responsibility for Case
        Subject data is shared between Afya na Haki and Partner Organizations, and that Afya
        na Haki does not automatically assume a Partner Organization's own data-protection
        obligations toward the people it represents.
      </P>
    ),
  },
  {
    id: 'suspension',
    title: 'Suspension, Restriction, and Termination of Accounts',
    content: (
      <P>
        We may suspend, restrict, or terminate an Account for violation of these Terms,
        suspected unauthorized use, a legal or regulatory requirement, or risk to a Case
        Subject's safety, with or without notice depending on severity. A Partner Organization
        may request that an individual's Account be revoked (for example, when they leave the
        organization) by contacting{' '}
        <a href="mailto:info@afyanahaki.org" className="text-primary hover:underline">info@afyanahaki.org</a> or an
        Admin.
      </P>
    ),
  },
  {
    id: 'data-export',
    title: 'Data Export and Account Closure',
    content: (
      <>
        <P>
          You can delete your own Account at any time from Settings &rarr; Security &rarr;
          Delete Account. This removes your name, email, phone number, and organization from
          your profile, revokes any Moderator/Admin/Scorecard Editor access, and disables
          sign-in permanently. It does not delete Case Records or Judgment Records you
          submitted — consistent with Section 10, those remain on the Platform, attributed to
          a deleted account rather than to you by name.
        </P>
        <Callout title="Current limitation">
          The Platform does not yet provide a self-service way to export a copy of your
          account data before deleting it. Contact{' '}
          <a href="mailto:itsupport@afyanahaki.org" className="text-primary hover:underline">itsupport@afyanahaki.org</a> to
          request a copy first, and we will process that request manually. See the Privacy
          Policy, Section 19, for data subject rights generally.
        </Callout>
      </>
    ),
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers and Limitations of Warranties',
    content: (
      <P>
        To the fullest extent permitted by applicable law, the Platform is provided "as is"
        and "as available," without warranties of any kind, express or implied, including
        accuracy, completeness, or fitness for a particular purpose. We do not warrant that
        case or judgment data submitted by Partner Organizations is accurate, complete, or
        current — it reflects what the submitting organization reported.
      </P>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    content: (
      <P>
        To the fullest extent permitted by applicable law, Afya na Haki will not be liable for
        indirect, incidental, special, consequential, or punitive damages arising from your
        use of the Platform, including damages arising from a Case Subject's data being
        visible to other Partner Organizations as described in Section 10. Nothing in these
        Terms excludes liability that cannot lawfully be excluded under applicable law.
      </P>
    ),
  },
  {
    id: 'indemnification',
    title: 'Indemnification',
    content: (
      <P>
        Where lawful, you and your organization agree to indemnify Afya na Haki against
        claims arising from data you submitted without a lawful basis to do so, or from your
        violation of these Terms.
      </P>
    ),
  },
  {
    id: 'governing-law',
    title: 'Dispute Resolution, Governing Law, and Jurisdiction',
    content: (
      <P>
        These Terms are governed by the laws of the Republic of Uganda, without regard to
        conflict-of-law principles. Afya na Haki is based in Uganda, and Ugandan courts have
        jurisdiction over any dispute arising from these Terms, notwithstanding the Platform's
        use across multiple African jurisdictions.
      </P>
    ),
  },
  {
    id: 'amendments',
    title: 'Amendments to These Terms',
    content: (
      <P>
        We may update these Terms from time to time. We will update the "Last updated" date
        above, and for material changes will provide reasonable advance notice (for example,
        an in-app notice or email) before they take effect. Continued use after a change takes
        effect constitutes acceptance of the updated Terms.
      </P>
    ),
  },
  {
    id: 'force-majeure',
    title: 'Force Majeure',
    content: (
      <P>
        We are not liable for a failure or delay in performance caused by events beyond our
        reasonable control, including infrastructure or internet outages, natural disasters,
        or actions of government authorities.
      </P>
    ),
  },
  {
    id: 'severability',
    title: 'Severability and Waiver',
    content: (
      <P>
        If a provision of these Terms is found unenforceable, the remaining provisions remain
        in effect. Our failure to enforce a provision is not a waiver of our right to do so
        later.
      </P>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Information and Notices',
    content: (
      <P>
        Questions about these Terms: <a href="mailto:info@afyanahaki.org" className="text-primary hover:underline">info@afyanahaki.org</a>.
        Formal legal notices should be sent to Plot 6105 Valley Road, Canaan Sites, Nakwero,
        Uganda.
      </P>
    ),
  },
];

export default function TermsOfUsePage() {
  return (
    <PublicScorecardChrome>
      <LegalPageLayout
        title="Terms of Use"
        description="These Terms govern your use of ReproPulse, the Afya na Haki platform tracking reproductive-rights litigation, judgments, and legal frameworks across Africa."
        effectiveDate="1 August 2025"
        lastUpdated="16 October 2026"
        sections={sections}
        otherDocLabel="Read our Privacy Policy"
        otherDocHref="/privacy-policy"
      />
    </PublicScorecardChrome>
  );
}
