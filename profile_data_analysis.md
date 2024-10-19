# PROFILE DATA analysis

##  [ Fri, October 15, 2024 ]

Note: This is the result of an initial data analysis which focused on an assessment of the presence of enough certificate and profile 'date' data to be able to support the Wicket membership date bracket data creation needed for Wicket Membership import. 

Method: Each My Profile data record was downloaded via the Cognito Forms API. The 'certificates' information was parsed from each profile and assessed for the presence of an 'issue date' and, in the case of missing certificate dates, for the presence of 'DateJoined'. (Missing or incorrect 'date' data negates the ability to convert legacy certificate-state data into Wicket membership-state data).


## RESULTS

- Profile Total Count: 3138 (Total count of profile data rows from My Profile Form)

### UNUSABLE PROFILES (RESIGNED)

( It is difficult or not possible to create date bracketed past memberships for this portion of the data. )

- RESIGNED & Without Any Dates Count: 435 (ProfileStatus=RESIGNED and lacking a date on any certificate and also lacking an ACMG join date)

### ALL PROFESSIONALS (CURRENT and PAST)

- Professional Total Count: 3043 (RESIGNED+INACTIVE+ACTIVE ProfileStatus indicating this is or was a certified member)
- Validation Problem Count: 596 (Missing one or more dates making membership time frame bracketing a challenge or not possible)
- Validation Problem Rate: 20% ( 1/5 of total Member Profiles are broken due to missing dates )


### CURRENT PROFESSIONALS

- Member Total Count: 1706 (INACTIVE+ACTIVE ProfileStatus indicating a member who renewed last year)
- Member Problem Count: 131 (Missing one or more dates making membership time frame bracketing a challenge or not possible)
- Validation Problem Rate: 8% ( 1/10 of Current Profiles are broken due to missing dates )


### RESIGNED NON-MEMBERS

- Resigned Total Count: 1337 (RESIGNED ProfileStatus indicating a formerly certified member who did not renew last year and who cannot login to the member site)
- Resigned Problem Count: 457 (Missing one or more dates making membership time frame bracketing a challenge or not possible)
- Validation Problem Rate: 34% ( 1/3 of RESIGNED Profiles are broken due to missing dates )


## PROPOSAL

Consider the current 1706 members the critical path priority. Attempt to remediate the deficient profiles before the Wicket data migration to support accurate membership creation.

Disregard the RESIGNED population and address that data as a secondary effort *after* the membership go-live transition to Wicket. 

The legacy distinction of a RESIGNED member is that they are considered a 'non-member' and are not able to log into the member website. From this perspective, they are outside of the ACMG without any form of membership and lacking any ability to interact with the member website. Because these people are not invited to log in, there is no immediate need to include them in the onboarding process. 

If we can ignore the RESIGNED member data and the volume of data quality problems that that population represents, then we can focus our energy on the improvement of the current member data (with only 131 date issues to tackle). 