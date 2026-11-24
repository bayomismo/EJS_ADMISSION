# EJS Admission Portal – Client Decision Request

**Prepared for:** Egyptian Japanese Schools (EJS)
**Date:** 24 November 2026
**Status:** Awaiting EJS decisions. **No decision in this document has been confirmed by EJS yet.**
**Total:** 22 decisions (Part A: 11 · Part B: 10 · Optional Confirmation: 1)

---

## Purpose

We are preparing the EJS Admission Portal for launch. Some points can only be decided by EJS, because they concern admission rules, school data, communication with parents, and legal texts.

For each item, please tick **Approved** or **Not Approved**, and add **Comments** where needed. Some items ask you to provide information. Please use the Comments field for those.

---

## Part A — Required before development can proceed (11 items)

These decisions are needed first. Work on the related parts of the portal cannot be completed until we receive them.

| No. | Decision | What we need EJS to confirm | Response | Comments |
|---|---|---|---|---|
| **D1** | Grades and age rules | Which grades are open for admission this year, and the minimum and maximum age on 1 October for each grade. The portal currently refers to both "KG1 to Grade 3" and "KG1 to Grade 6", so please confirm which applies and list the age rules in Comments. | ☐ Approved ☐ Not Approved | |
| **D2** | Staff notes visible to parents | Whether notes written by admissions staff on an application should be shown to parents when they check their status online. *(Approved = shown to parents; Not Approved = internal only.)* | ☐ Approved ☐ Not Approved | |
| **D2-b** | Details shown in the status check | Whether parents checking their status online may also see the student's name, school and grade, in addition to the status and dates. *(Approved = also show name, school and grade.)* | ☐ Approved ☐ Not Approved | |
| **D3** | Email notifications | Whether automatic email notifications to parents are needed in the first release. *(Approved = email notifications are **not** required for the first release, and parents check their status online. Not Approved = EJS requires email notifications for the first release.)* Requiring notifications may affect the delivery schedule. | ☐ Approved ☐ Not Approved | |
| **D4** | Time of submission | Whether the time an application is submitted is used as a criterion in admission decisions. *(Approved = yes, it is a criterion.)* | ☐ Approved ☐ Not Approved | |
| **D5-a** | Application data retention period | How long application data should be kept after the admission cycle. Please state the period in Comments. | ☐ Approved ☐ Not Approved | |
| **D5-b** | Required documents list | That the list shown to parents matches EJS's current document submission process: (1) child's digital birth certificate, (2) guardian's national ID card, (3) child's vaccination certificate, (4) six recent photos of the child, (5) enrolment certificate from the previous school (transfers only). | ☐ Approved ☐ Not Approved | |
| **D6** | Teacher applications | Whether online teacher job applications will be open in this release. *(Approved = open; Not Approved = closed for this release.)* | ☐ Approved ☐ Not Approved | |
| **E-08** | One application per applicant | Whether each applicant (identified by national ID) may have only one active application at a time, with a new application allowed only after the previous one is rejected. **Please confirm explicitly whether this rule applies to student applications only, or to both student and teacher applications.** | ☐ Approved – student applications only ☐ Approved – student and teacher applications ☐ Not Approved | |
| **E-01** | Boys / girls / mixed classification of schools | The classification of each of the 99 schools as boys-only, girls-only or mixed. **We will first share the 99-school list for review. EJS approval will be requested once the list has been shared.** | *To be completed after the list is shared:* ☐ Approved ☐ Not Approved | |
| **E-02** | Official school list | The official list of the 99 schools: names, governorate, city, and type (Arabic or Languages). **We will first share the list for review. EJS approval will be requested once the list has been shared.** | *To be completed after the list is shared:* ☐ Approved ☐ Not Approved | |

---

## Part B — Required before acceptance testing (UAT) and launch (10 items)

| No. | Decision | What we need EJS to confirm | Response | Comments |
|---|---|---|---|---|
| **D7** | Staff access list | The EJS staff who need access to the admin area, the role of each person, and which schools or governorates each person may see. Please provide the list in Comments or as an attachment. | ☐ Approved ☐ Not Approved | |
| **D9** | School gender rule | That girls cannot apply to boys-only schools, boys cannot apply to girls-only schools, and mixed schools are open to both. *(Approved by the project owner; awaiting EJS confirmation. This rule works only together with the school classification in E-01.)* | ☐ Approved ☐ Not Approved | |
| **D10** | Staff session length | That staff are signed out automatically 8 hours after signing in, even if they are still active. *(Provisionally approved by the project owner; awaiting EJS confirmation.)* | ☐ Approved ☐ Not Approved | |
| **E-03** | Retention of security logs | The retention period for system security logs that include staff account identifiers. *(Proposed: a maximum of 30 days.)* | ☐ Approved ☐ Not Approved | |
| **E-04** | Legal review | That EJS's legal adviser will review the Terms and Privacy texts, including how they apply under the Egyptian Personal Data Protection Law (Law No. 151 of 2020). | ☐ Approved ☐ Not Approved | |
| **D5-c** | Privacy Policy text | Approval of the proposed Privacy Policy text to be published on the portal. **We will share the proposed text for review first. Please approve only after reviewing that text.** | *To be completed after the text is shared:* ☐ Approved ☐ Not Approved | |
| **E-05** | Parent support contact | The phone number or email address parents can use for help, for example if they lose their application reference number. Please provide it in Comments. | ☐ Approved ☐ Not Approved | |
| **E-06** | Admission period | The academic year, and the opening and closing dates of the admission period at launch. Please provide them in Comments. | ☐ Approved ☐ Not Approved | |
| **E-07** | Official portal address | The official web address (domain) of the portal. Please provide it in Comments. | ☐ Approved ☐ Not Approved | |
| **E-09** | Sign-off and launch contacts | The EJS representatives who will sign off acceptance testing, and the EJS contact during the first 48 hours after launch. Please provide names in Comments. | ☐ Approved ☐ Not Approved | |

---

## Optional Confirmation (1 item)

This item is **optional** and **does not block development**. If EJS has no specific policy, the portal will use standard security settings.

| No. | Decision | What we need EJS to confirm | Response | Comments |
|---|---|---|---|---|
| **E-10** | Staff password policy | Whether EJS has an information security policy for staff passwords and account lockout that the portal must follow. *(Approved = an EJS policy applies; please describe it in Comments. Not Approved = no specific EJS policy.)* | ☐ Approved ☐ Not Approved | |

---

## For information — decisions already made by the project owner

These are **not** EJS decisions. They are shared for transparency only, and **no approval is requested**.

| Decision | Status |
|---|---|
| Online upload of applicant documents is **not included** in this release. Applicants follow EJS's existing document submission process. Online document management may be considered as a separate future project. | Decided by the project owner. EJS is asked only to confirm the documents list (D5-b). |
| The school gender rule (D9) | Approved by the project owner. **EJS confirmation requested** (Part B). |
| Staff session length of 8 hours (D10) | Provisionally approved by the project owner. **EJS confirmation requested** (Part B). |

---

## Next steps

Please review this document and return it with your decisions and comments. Part A items are the most urgent, because work on the related parts of the portal cannot continue without them. Where an item asks for information (lists, dates, contacts), please include it in the Comments column or attach it.

Until EJS confirms them in writing, we will treat all items in this document as **pending**.

Thank you for your support.

**Contact:** *(project owner to add name and contact details)*
