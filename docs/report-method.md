# Report method

## Report outcome

The report should give a business owner a small number of practical next steps, not a long list of technical warnings.

## Report structure

1. **What we reviewed**: URL, review date, pages checked, and completed or unavailable checks.
2. **First-fold clarity**: what a new visitor can and cannot understand before scrolling.
3. **Three priorities**: the most important improvements, ordered by likely effect on visitor understanding and action.
4. **Technical signals**: relevant performance, mobile, contact-path, basic SEO, and public platform or dependency evidence.
5. **Control questions**: account ownership, website-administration access, third-party-service ownership, and change-management questions the business should answer internally.
6. **Next step**: an invitation to discuss the findings with Pilot My Tech.

## Reviewer checklist

Before delivery, confirm that:

- The report cites evidence for each conclusion.
- Measured facts and AI inferences are clearly labeled.
- The three priorities are specific and feasible.
- The recommendations fit the stated business goal.
- The report does not overstate what an automated review can know.
- Platform and dependency clues are labeled as observed evidence, not proof of account ownership or administrator access.
- The business name and URL are correct.

## Platform finding format

When the review identifies a likely platform or dependency, present it in this format:

```text
Observed platform: WordPress, high confidence
Evidence: Public page assets include `/wp-content/` and the contact form posts through `admin-ajax.php`.
What this does not tell us: We cannot determine who has the WordPress administrator account or whether the business controls it.
Control question: Does the business have a documented administrator account, hosting access, backups, and a current plugin-update process?
```

This format keeps the finding useful without implying a security diagnosis or an unverified vendor relationship.

## Early delivery model

During the hybrid phase, deliver a short email or a private report link only after human review. Track which findings lead to useful conversations and revise the rubric based on real outcomes.
