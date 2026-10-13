import { PublicScorecardChrome } from '../../scorecard/components/PublicScorecardChrome';
import { LegalPageLayout, Placeholder, Callout, type LegalSection } from './LegalPageLayout';

const P = ({ children }: { children: React.ReactNode }) => <p>{children}</p>;
const UL = ({ children }: { children: React.ReactNode }) => (
  <ul className="list-disc pl-5 space-y-1.5">{children}</ul>
);

const sections: LegalSection[] = [
  {
    id: 'introduction',
    title: 'Introduction and Scope',
    content: (
      <P>
        This Privacy Policy explains how <Placeholder>[PLATFORM LEGAL NAME]</Placeholder>,
        operating ReproPulse as part of the Afya na Haki LIRA Programme ("Afya na Haki," "we,"
        "us"), collects, uses, shares, retains, and protects personal data in connection with
        the Platform — both for signed-in Account Holders and for Case Subjects whose data
        appears in case and judgment records submitted by Partner Organizations. It applies to
        the public Scorecard pages (no account needed) and to every signed-in area of the
        Platform. It does not require you to create an account to read it.
      </P>
    ),
  },
  {
    id: 'controller',
    title: 'Who Is Responsible for Your Data',
    content: (
      <>
        <P>
          For account and platform-operation data (Section 4), Afya na Haki is the data
          controller. For personal data about Case Subjects within case and judgment records,
          responsibility is shared and explained in full in Section 19 — Afya na Haki does not
          automatically become the sole controller of every Case Subject's data merely by
          hosting it.
        </P>
        <P>
          Contact: <Placeholder>[PLATFORM LEGAL NAME]</Placeholder>,{' '}
          <Placeholder>[REGISTERED BUSINESS ADDRESS]</Placeholder>,{' '}
          <Placeholder>[PRIVACY CONTACT EMAIL]</Placeholder>.
        </P>
      </>
    ),
  },
  {
    id: 'architecture',
    title: "The Platform's Shared, Cross-Organizational Architecture",
    content: (
      <>
        <P>
          ReproPulse is used by many Partner Organizations from one shared application and
          database — but it is not a siloed, per-tenant system. Concretely, today:
        </P>
        <UL>
          <li>A submission you make awaits review visible only to you and to Moderators/Admins while pending.</li>
          <li>Once approved (or uploaded directly by a Moderator/Admin), a case or judgment record becomes visible to <strong>every signed-in user across every Partner Organization</strong> — not restricted to your own organization. This is an intentional design choice, confirmed by Afya na Haki: the Platform exists to give the coalition a shared, cross-organizational view of reproductive-rights litigation for coordinated advocacy, not a siloed per-organization database.</li>
          <li>Published judgment records are visible to any authenticated user regardless of role or organization, for the same reason.</li>
          <li>Moderator accounts affiliated with Afya na Haki itself can see every case for platform-oversight purposes. Moderator accounts affiliated with any other Partner Organization can see only the cases they personally uploaded — not every case belonging to their organization, and not every case platform-wide. This scoping is the default for every Partner Organization's moderators, not a privilege limited to a named list.</li>
        </UL>
        <P>
          We do not offer per-organization confidentiality for <em>published</em> case or
          judgment records — that visibility is by design, described above. If a matter must
          be kept confidential from other Partner Organizations entirely, do not submit it to
          the Platform; submit it through your organization's own channels instead.
        </P>
      </>
    ),
  },
  {
    id: 'data-categories',
    title: 'Categories of Personal Data We Collect',
    content: (
      <>
        <P><strong>About Account Holders:</strong> full name, email address, password (held by our authentication provider, not visible to us in plain text), profession, phone number, organization, and role (regular user, Moderator, Admin, Scorecard Editor).</P>
        <P><strong>About Case Subjects (people who are not Account Holders):</strong> names and roles of litigants and defending institutions; for Rapid Response cases, a client's name, email, and phone number; free-text case summaries, flynotes, action narratives, and impact descriptions, which may describe a person's reproductive-health status, experience of sexual or gender-based violence, or involvement in a criminal matter; attached PDF documents (litigation filings, judgments), which can contain a Case Subject's full name, address, and other identifying or sensitive detail exactly as the underlying document records it.</P>
      </>
    ),
  },
  {
    id: 'sources',
    title: 'Sources of Personal Data',
    content: (
      <P>
        Account Holder data comes directly from you at registration. Case Subject data comes
        from the Partner Organization or Moderator who submits a case, judgment, or Rapid
        Response record — never directly from the Case Subject themselves through this
        Platform.
      </P>
    ),
  },
  {
    id: 'purposes',
    title: 'Purposes and Legal Bases for Processing',
    content: (
      <>
        <P><strong>Account data</strong> is processed to operate your account, authenticate you, route notifications, and administer roles — necessary to perform our agreement with you (these Terms) and our legitimate interest in running the Platform securely.</P>
        <P><strong>Case Subject data</strong> is processed to support the coalition's shared litigation-tracking and advocacy purpose. Because this can include special categories of data (health, sex life, criminal-matter information) under data protection law, the legal basis for processing it rests heavily on the lawful basis the submitting Partner Organization already holds in its own relationship with the Case Subject (see Section 19) — Afya na Haki's own basis for making the record available platform-wide is its legitimate interest in cross-organizational advocacy, balanced against the Case Subject's rights, which is why Section 7 asks submitters to actively consider that balance before submitting.</P>
        <P><strong>Scorecard data</strong> (country-level indicator scores) is aggregate and not personal data.</P>
      </>
    ),
  },
  {
    id: 'submission-data',
    title: 'Case, Judgment, and Rapid Response Submissions',
    content: (
      <P>
        When you submit a case or judgment (individually, via bulk CSV upload, or as a direct
        upload if you are a Moderator/Admin), the fields you complete — including any Case
        Subject data — are stored and, once approved, published as described in Section 3. In
        addition, an in-progress submission is auto-saved as a draft in your own browser's
        local storage (not on our servers) so you can resume later; this draft, including any
        Case Subject name, email, or phone number you have typed so far, remains in your
        browser until you submit or it is cleared, and is not encrypted at rest in the browser.
        Clear your browser data on shared or public devices if you have drafted a submission
        there.
      </P>
    ),
  },
  {
    id: 'account-data',
    title: 'Partner Organization Account Information',
    content: (
      <P>
        Your name, email, organization, profession, phone number, and role are visible to
        Admins managing access, and your name and organization are visible to other signed-in
        users wherever you are shown as a case's or judgment's associated submitter or
        moderator.
      </P>
    ),
  },
  {
    id: 'notifications',
    title: 'Notifications and Transactional Emails',
    content: (
      <P>
        We send operational emails — submission-received confirmations, approval/rejection
        decisions, and new-submission alerts to Moderators — via our email provider (Section
        14). These are not marketing emails, and the Platform does not send SMS messages of
        any kind.
      </P>
    ),
  },
  {
    id: 'visibility',
    title: 'Who Can See Your Data',
    content: (
      <P>
        See Section 3 for the full, current picture: published case records are visible to
        all signed-in users across Partner Organizations; published judgment records are
        visible to any authenticated user; Admins can see account-management data for every
        Account Holder. We do not share Case Subject data with anyone outside the Platform
        except the Service Providers in Section 14, or where required by law.
      </P>
    ),
  },
  {
    id: 'analytics-scorecard',
    title: 'Analytics and the Public Scorecard',
    content: (
      <P>
        The Analytics dashboards summarize the case dataset (trends, geography, outcomes) for
        signed-in users; they are not a vehicle for identifying an individual Case Subject. The
        public Maputo Protocol Scorecard at <code>/scorecard/analysis</code> shows only
        aggregate, country-level indicator scores based on published assessments — it contains
        no Case Subject or Account Holder personal data, and no account is needed to view it.
      </P>
    ),
  },
  {
    id: 'technical-data',
    title: 'Technical Data, Cookies, and Local Storage',
    content: (
      <>
        <P>
          We do not use advertising or analytics cookies, and the Platform does not run
          third-party tracking scripts. Standard session cookies/tokens used by our
          authentication provider are necessary for sign-in to function.
        </P>
        <P>
          As described in Section 7, the browser's local storage is used to auto-save
          in-progress submission drafts on your own device — this is functional storage, not
          tracking, but it is not encrypted and is not transmitted to us until you submit the
          form.
        </P>
        <P>
          If error monitoring (<Placeholder>[ERROR MONITORING PROVIDER]</Placeholder>) is
          enabled in a given environment, it may incidentally capture technical details about
          an error (browser, URL, a short code context) but is not configured to log full case
          records, passwords, or authentication tokens.
        </P>
      </>
    ),
  },
  {
    id: 'disclosure-partners',
    title: 'Disclosure Within the Platform',
    content: (
      <P>
        Beyond the platform-wide visibility described in Section 3, we do not disclose Case
        Subject or Account Holder data to other Partner Organizations outside the Platform
        itself.
      </P>
    ),
  },
  {
    id: 'service-providers',
    title: 'Disclosure to Service Providers',
    content: (
      <>
        <P>We rely on the following Service Providers, each processing data only as needed to provide their service to us:</P>
        <UL>
          <li><strong>Supabase</strong> — database, authentication, and file storage. Hosting region: <Placeholder>[HOSTING PROVIDERS]</Placeholder>.</li>
          <li><strong>Vercel</strong> — web application hosting.</li>
          <li><strong>Resend</strong> — transactional email delivery (sends the notices in Section 9 on our behalf; receives the recipient's email address and message content).</li>
          <li><strong>[ERROR MONITORING PROVIDER]</strong> (Sentry) — optional error monitoring, where enabled.</li>
        </UL>
        <P>We do not use SMS providers or payment processors; none are integrated into the Platform today.</P>
      </>
    ),
  },
  {
    id: 'international-transfers',
    title: 'International Transfers of Personal Data',
    content: (
      <P>
        Because Partner Organizations and Case Subjects are located across multiple African
        countries while our Service Providers' infrastructure may be hosted elsewhere, personal
        data may be transferred across borders. Cross-border transfer arrangements and
        safeguards are being confirmed: <Placeholder>[CROSS-BORDER TRANSFER ARRANGEMENTS]</Placeholder>.
      </P>
    ),
  },
  {
    id: 'retention',
    title: 'Data Storage, Retention, and Deletion',
    content: (
      <Callout title="Retention periods pending confirmation">
        We do not yet operate a published retention schedule. Account data, case/judgment
        records, and audit logs are currently retained indefinitely pending a documented
        schedule: <Placeholder>[RETENTION PERIODS]</Placeholder>. We recommend adopting and
        publishing a retention schedule, particularly for Case Subject data, as a priority
        follow-up to this policy (see the accompanying implementation checklist).
      </Callout>
    ),
  },
  {
    id: 'security',
    title: 'Security Safeguards and Incident Response',
    content: (
      <>
        <P>We apply the following safeguards today:</P>
        <UL>
          <li>Role-based access control (regular user, Moderator, Admin, Scorecard Editor), enforced by database-level row security policies, not just the application UI.</li>
          <li>Authenticated-only access to case, judgment, and document storage (publicly accessible content is limited to the aggregate Scorecard).</li>
          <li>Every grant or revoke of Moderator/Admin/Scorecard Editor access is recorded in a visible audit log.</li>
        </UL>
        <P>
          We do not currently publish a formal incident-response procedure or guarantee
          specific encryption-at-rest configurations beyond what our Service Providers provide
          by default; this is an area flagged for further documentation. No security measure is
          absolute, and we cannot guarantee data will never be accessed, disclosed, or altered
          in breach of these safeguards.
        </P>
      </>
    ),
  },
  {
    id: 'data-protection-roles',
    title: 'Data Protection Responsibilities: Who Does What',
    content: (
      <>
        <P>
          We do not assume, by default, that every Partner Organization is a "data processor"
          acting only on our instructions, nor that Afya na Haki is the sole "data controller"
          for every piece of Case Subject data on the Platform. Roles depend on who actually
          decides why a person's data is recorded and how it is used:
        </P>
        <UL>
          <li>When a Partner Organization decides to submit a specific person's case — what to include, why, and for what advocacy purpose — that organization is acting as a controller of that data in its own right, independent of Afya na Haki's instructions.</li>
          <li>Afya na Haki acts as a controller for the platform-operation purposes it determines itself: making approved records available platform-wide, producing aggregate analytics, and publishing the Scorecard.</li>
          <li>Where a Partner Organization's relationship with Afya na Haki more closely resembles instructed processing of specific data for them alone (for example, a private draft not yet published), Afya na Haki holds that data as it would for any processor relationship, pending a formal data processing agreement.</li>
        </UL>
        <P>
          We recommend each Partner Organization execute a data processing or data-sharing
          agreement with Afya na Haki clarifying these roles for its own records (see the
          recommended supplementary documents list accompanying this policy).
        </P>
      </>
    ),
  },
  {
    id: 'rights',
    title: 'Data Subject Rights',
    content: (
      <>
        <P>
          Subject to applicable law (including Uganda's Data Protection and Privacy Act, 2019,
          and, where applicable, the EU/UK GDPR), you may have the right to access, correct,
          delete, or obtain a copy of your personal data, restrict or object to its processing,
          and withdraw consent where consent is the basis for processing.
        </P>
        <Callout title="Current limitation">
          The Platform does not yet provide self-service tools for these requests. Contact
          <Placeholder> [PRIVACY CONTACT EMAIL]</Placeholder> and we will process the request
          manually. For a Case Subject (who is not an Account Holder and cannot contact us
          directly through the Platform), requests should generally be directed to the Partner
          Organization that submitted their case, who can in turn contact us.
        </Callout>
      </>
    ),
  },
  {
    id: 'exercising-rights',
    title: 'How to Exercise These Rights',
    content: (
      <P>
        Email <Placeholder>[PRIVACY CONTACT EMAIL]</Placeholder> describing the request and,
        where applicable, which Case Record it concerns. We will confirm receipt and aim to
        respond within the time limits applicable law requires, verifying your identity (or
        your organization's authority to act for a Case Subject) before acting on the request.
      </P>
    ),
  },
  {
    id: 'withdrawal',
    title: 'Withdrawal of Consent and Objection',
    content: (
      <P>
        Where processing rests on consent, you may withdraw it at any time by contacting
        <Placeholder> [PRIVACY CONTACT EMAIL]</Placeholder>; this does not affect the lawfulness
        of processing carried out before withdrawal. You may object to processing based on
        legitimate interest; we will consider the objection and respond.
      </P>
    ),
  },
  {
    id: 'special-category',
    title: 'Special Category and Sensitive Data',
    content: (
      <P>
        Case and judgment records on this Platform routinely concern reproductive health,
        sexual and gender-based violence, and sometimes criminal-matter information — special
        categories of data warranting heightened protection under applicable law. We rely on
        the basis described in Section 6 and the submitter obligations in Section 7 for this
        data; Partner Organizations should apply particular care, and seek their own legal
        advice, before submitting a case involving such information.
      </P>
    ),
  },
  {
    id: 'children',
    title: "Children's Personal Data",
    content: (
      <P>
        Account registration is not intended for anyone under 18. However, case and judgment
        records may describe a minor as a Case Subject (for example, in a defilement or
        child-marriage matter) because the underlying litigation concerns that minor. Afya na
        Haki does not independently verify a submitting Partner Organization's child
        safeguarding practices; we expect submitters to apply their own organization's child
        protection obligations and exercise particular care before including an identifiable
        minor's details in a platform-wide-visible record.
      </P>
    ),
  },
  {
    id: 'automated-decisions',
    title: 'Automated Decision-Making and Profiling',
    content: (
      <P>
        The Platform does not use automated decision-making or profiling that produces legal
        or similarly significant effects on any individual. Moderation decisions are made by a
        human Moderator.
      </P>
    ),
  },
  {
    id: 'complaints',
    title: 'Complaints',
    content: (
      <P>
        If you have a concern about how we handle personal data, contact
        <Placeholder> [PRIVACY CONTACT EMAIL]</Placeholder> first so we can try to resolve it.
        You may also have the right to lodge a complaint with Uganda's Personal Data
        Protection Office, or with the relevant supervisory authority in your own country,
        depending on applicable law.
      </P>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to This Privacy Policy',
    content: (
      <P>
        We may update this Privacy Policy from time to time. We will update the "Last updated"
        date above and, for material changes, provide reasonable advance notice before they
        take effect.
      </P>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Details',
    content: (
      <P>
        Privacy requests: <Placeholder>[PRIVACY CONTACT EMAIL]</Placeholder>. General
        questions: <a href="mailto:info@afyanahaki.org" className="text-primary hover:underline">info@afyanahaki.org</a>.
        Postal address: <Placeholder>[REGISTERED BUSINESS ADDRESS]</Placeholder>.
      </P>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PublicScorecardChrome>
      <LegalPageLayout
        title="Privacy Policy"
        description="How ReproPulse collects, uses, shares, retains, and protects personal data — for signed-in Account Holders and for the people described in case and judgment records."
        effectiveDate="[EFFECTIVE DATE]"
        lastUpdated="16 October 2026"
        sections={sections}
        otherDocLabel="Read our Terms of Use"
        otherDocHref="/terms-of-use"
      />
    </PublicScorecardChrome>
  );
}
