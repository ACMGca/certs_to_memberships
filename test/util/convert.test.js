import { expect, test } from "bun:test";
import { convertCognitoToWicket } from "../../util/convert.js";
import { getCognitoCertificateSchema } from "../../schema/cognito_certificates_schema.js";

const cognitoCertificateSchema = getCognitoCertificateSchema()

// Case 3004 [https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/3004]
// Actual data contains a supersedence error needing correction
// This is a simple case with complete data and one simple supersedence case
test('Simple CGI1 to CGI2 Scenario', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '2023-11-03',
    DateEnd: null,
    DateReinstate: null,
    LastAnnualValidation: '2024-01-05',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    CGI1: {
      status: null,
      date: '2023-10-01',
      lastModified: null
    },
    CGI2: {
      status: 'Active',
      date: '2024-09-13',
      lastModified: '2024-09-13'
    }
  }

  const expected = {
    professional: [
      [
        'climbing_gym_instructor_level_1',
        'Inactive',
        '2023-11-03',
        '2024-09-12'
      ],
      [
        'climbing_gym_instructor_level_2',
        'Active',
        '2024-09-13',
        '2024-12-31'
      ]
    ]
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result).toMatchObject(expected)
})

// CASE 12 Modeled after M.A. [ https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/12 ]
// Continuously active member with complete data and smooth progression through the training.
// Multiple cases of supersedence and progression from Alpine Guide to Mountain Guide with 
// a one-day-duration Ski Guide (exam success).
test('Continuous Active Membership with Progression to Mountain Guide', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '2001-09-01',
    DateEnd: null,
    DateReinstate: null,
    LastAnnualValidation: '2024-12-05',
    IFMGALicenseNumber: '499', // Because of this,
    SkiExamMode: 'Ski',        // and this, 
    "MG": {                    //
      "status": "Active",      // and MG.status === 'Active' an IFMGA Wicket Membership Tier is also created.
      "date": "2009-04-01",
      "lastModified": null
    },
    "AG": {
      "status": null,
      "date": "2006-09-01",
      "lastModified": null
    },
    "SG": {
      "status": null,
      "date": "2009-04-01",
      "lastModified": null
    },
    "AAG": {
      "status": null,
      "date": "2003-09-01",
      "lastModified": null
    },
    "ASG": {
      "status": null,
      "date": "2007-03-01",
      "lastModified": null
    },
    "ARG": {
      "status": null,
      "date": "2001-09-01",
      "lastModified": null
    }
  }

  const expected = {
    "professional": [
      [
        "apprentice_rock_guide",
        "Inactive",
        "2001-09-01",
        "2003-08-31"
      ],
      [
        "apprentice_alpine_guide",
        "Inactive",
        "2003-09-01",
        "2006-08-31"
      ],
      [
        "alpine_guide",
        "Inactive",
        "2006-09-01",
        "2009-03-31"
      ],
      [
        "apprentice_ski_guide",
        "Inactive",
        "2007-03-01",
        "2009-03-31"
      ],
      [
        "mountain_guide",
        "Active",
        "2009-04-01",
        "2025-12-31"
      ],
      [
        "ifmga",
        "Active",
        "2009-04-01",
        "2025-12-31"
      ]
    ]
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result).toMatchObject(expected)
})

// CASE 744 Modeled after R.K. [ https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/744 ]
// This is less typical (~20 current profiles) but not uncommon for some longstanding and awarded members.
// This covers a couple of nuanced problems:
// 1) This shows the schema transformer using other dates to backfill a missing lastModified date
// 2) It shows the membership gap given a known ending and reinstatement
test.todo('Longstanding member with incomplete but inferrable date data', () => {

  const source = {
    ProfileStatus: 'INACTIVE',
    DateJoined: '1978-01-01',
    DateEnd: '2005-01-01',
    DateReinstate: '2005-11-01',
    LastAnnualValidation: '2024-01-05',
    IFMGALicenseNumber: '0', // TODO: Review - Inactive means no license number, I think? 
    SkiExamMode: 'Ski',
    "MG": {
      "status": "Inactive",
      "date": null,
      "lastModified": null // An Inactive cert without a lastModified date is a problem that is self healed in the schema transformer
    }                      // with the rule being that it will use the latter of DateReinstate or DateEnd to backfill it.
  }

  const expected = {
    "professional": [
      [
        "mountain_guide",
        "Inactive",
        "1978-01-01",
        "2005-01-01"
      ],
      [
        "inactive_member",
        "Inactive",
        "2005-11-01",
        "2023-12-31"
      ],
      [
        "inactive_member",
        "Active",
        "2023-12-31",
        "2024-12-31"
      ]
    ]
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result).toMatchObject(expected)
})

// A.C. HG, SG, former DHG and with WT [ https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/215 ]
test('An Active HG+SG with DHG history and Winter Travel', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '2007-01-01',
    DateEnd: null,
    DateReinstate: null,
    LastAnnualValidation: '2024-01-05',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    "SG": {
      "status": "Active",
      "date": "2021-01-01",
      "lastModified": null
    },
    "ASG": {
      "status": null,
      "date": "2009-04-01",
      "lastModified": null
    },
    "DHG": {
      "status": null,
      "date": "2006-09-01",
      "lastModified": null
    },
    "HG": {
      "status": "Active",
      "date": "2007-06-01",
      "lastModified": null
    },
    "HGWT": {
      "status": "Acquired",
      "date": null,
      "lastModified": null
    }
  }

  const expected = {
    "professional": [
      [
        "day_hiking_guide",
        "Inactive",
        "2007-01-01",
        "2007-05-31" // one day before - ended by HG
      ],
      [
        "hiking_guide",
        "Inactive",
        "2007-06-01",
        "2009-03-31" // ended by the ASG -1 day
      ],
      [
        "apprentice_ski_guide",
        "Inactive",
        "2009-04-01",
        "2020-12-31" // ended by SG
      ],
      [
        "hiking_guide_winter",
        "Active",
        "2009-04-01", // started by the ASG
        "2024-12-31"
      ],
      [
        "ski_guide",
        "Active",
        "2021-01-01",
        "2024-12-31"
      ]
    ]
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result).toMatchObject(expected)
})

// Similar to A.C. but detuned example to use AHG, ASG to trigger WT 
test('An Active AHG+ASG to demonstrate Winter Travel implementation', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '2006-09-15',
    DateEnd: null,
    DateReinstate: null,
    LastAnnualValidation: '2024-01-05',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    "ASG": {
      "status": 'Active',
      "date": "2009-04-01",
      "lastModified": null
    },
    "AHG": {
      "status": 'Active',
      "date": "2006-09-01",
      "lastModified": null
    },
    "HGWT": {
      "status": "Acquired",
      "date": null,
      "lastModified": null
    }
  }

  const expected = {
    "professional": [
      [
        "apprentice_hiking_guide",
        "Inactive",
        "2006-09-15", // starts with the Join date because it's later than the certificate date
        "2009-03-31"  // but ends the day before the ASG certificate
      ],
      [
        "apprentice_ski_guide",
        "Active",
        "2009-04-01", // starts with the ASG date
        "2024-12-31" // ends as normal annual membership
      ],
      [
        "apprentice_hiking_guide_winter",
        "Active",
        "2009-04-01", // starts the same day as the ASG due to the enhance winter scope of practice
        "2024-12-31"  // ends as normal for the year end
      ]
    ]
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result).toMatchObject(expected)
})

// Simplest test case to support an explicit date set for Winter Travel
test('Winter Travel with an explicit date splits a AHG certificate into two memberships', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '2006-09-15',
    DateEnd: null,
    DateReinstate: null,
    LastAnnualValidation: '2024-01-05',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    "AHG": {
      "status": 'Active',
      "date": "2006-09-01",
      "lastModified": null
    },
    "HGWT": {
      "status": "Acquired",
      "date": '2012-03-15',
      "lastModified": null
    }
  }

  const expected = {
    "professional": [
      [
        "apprentice_hiking_guide",
        "Inactive",
        "2006-09-15", // starts with the Join date because it's later than the certificate date
        "2012-03-14"  // but ends the day before the WT Certificate was Acquired
      ],
      [
        "apprentice_hiking_guide_winter",
        "Active",
        "2012-03-15", // starts with the WT date
        "2024-12-31" // ends as normal annual membership
      ]
    ]
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result).toMatchObject(expected)
})

// B.B. [https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/3184]
// This is a brand new 2024 Member who had a CGI1 from 2022 but never used it to become a member until 2024.
// The test shows the use of the DateJoined when the certificate dates predate membership.
// (Wicket memberships should show dates according to ACMG Membership rather than TAP Designation.)
test('New Member in 2024 with earlier designation dates', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '2024-09-09',
    DateEnd: null,
    DateReinstate: null,
    LastAnnualValidation: '2024-01-05',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    "AHG": {
      "status": "Active",
      "date": "2024-06-12",
      "lastModified": "2024-06-12"
    },
    "CGI1": {
      "status": "Active",
      "date": "2022-06-01",
      "lastModified": "2022-06-01"
    }
  }
  const expected = {
    "professional": [
      [
        "climbing_gym_instructor_level_1",
        "Active",
        "2024-09-09",
        "2024-12-31"
      ],
      [
        "apprentice_hiking_guide",
        "Active",
        "2024-09-09",
        "2024-12-31"
      ]]
  }
  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result).toMatchObject(expected)
})

// Recently resigned with good dates on the profile.
// (This should be a simple case for a person with a Resigned profile)
// L.C. https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/231 RESIGNED [231.json]
test('A resigned member shows an Inactive Tier bracket ending in the past', () => {

  const source = {
    ProfileStatus: 'RESIGNED',
    DateJoined: '2016-05-01',
    DateEnd: null,
    DateReinstate: null,
    LastAnnualValidation: '2023-01-01',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    CGI1: {
      status: 'Resigned',
      date: '2015-12-01',
      lastModified: '2024-03-01'
    }
  }
  const expected = {
    "professional": [
      [
        "climbing_gym_instructor_level_1",
        "Inactive",   // The tier status is Inactive because the bracket end date is in the past
        "2016-05-01", // Starts on the DateJoined because it is after the certificate date
        "2024-03-01"  // Ends on the LastModified date
      ]
    ]
  }
  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result).toMatchObject(expected)
})

// An otherwise ACTIVE looking profile without a LastAnnualValidation value is a person who is NOT YET a member. 
// They have been set up to go through the Renewal Form but they have not yet done it. This breaks the ability to
// determine their Active Membership end date. However, it makes sense not to give them any memberships because 
// they have yet to actually join the ACMG. 
test('An Active and ready-to-join member who has not yet joined gets no Wicket Memberships', () => {

  const source = {
    ProfileStatus: 'ACTIVE', // This needs to be confirmed that an unjoined new member is ACTIVE
    "DateJoined": "2024-12-18",
    "DateEnd": null,
    "DateReinstate": null,
    "LastAnnualValidation": null,
    "IFMGALicenseNumber": "0",
    "SkiExamMode": "Ski",
    "ASG": {
      "status": "Active",
      "date": "2024-12-16",
      "lastModified": "2024-12-16"
    }
  }
  const expected = {
    "professional": [] // An empty set indicates no Wicket Memberships as possible valid representation
  }
  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result).toMatchObject(expected)
})

// P.H. https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/580
// An Inactive Member should end with a Wicket *Active* "Inactive Membership" Tier
test('An Inactive Member converts to a Wicket Active Inactive Membership tier', () => {

  const source = {
    ProfileStatus: 'INACTIVE',
    DateJoined: '1988-01-01',
    DateEnd: null,
    DateReinstate: null,
    LastAnnualValidation: '2024-02-25',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    transforms: [],
    MG: {
      status: 'Inactive',
      date: '1994-01-01',
      lastModified: '2023-01-28'
    },
    AAG: {
      status: null,
      date: '1988-01-01',
      lastModified: null
    }
  }

  const expected = {
    professional: [
      [
        'apprentice_alpine_guide',
        'Inactive',
        '1988-01-01',
        '1993-12-31'
      ],
      [
        'mountain_guide',
        'Inactive',
        '1994-01-01',
        '2023-01-28'       // We can't know from the data but can presume that Inactive was preceded by Active
      ],                   // and so the LastModified date forms the end of that bracket.
      [
        'inactive-member', // Because the source profile is known to be ProfileStatus: INACTIVE
        'Active',          // we know that it should become a valid Inactive Membership in Wicket:
        '2023-01-29',      // The Active 'Inactive Member' membership starts the day after the most recent ending date
        '2024-12-31'       // And ends according to the normal year bracket for the LastAnnualValidation
      ]
    ]
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result).toMatchObject(expected)
})

// C.J. https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/682
// Active Alpine Guide, Conversion Error results in RG incomplete
test('Prior Conversion Error - Active Alpine Guide results in correct RG inactive tier', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '1999-01-01',
    DateEnd: null,
    DateReinstate: null,
    LastAnnualValidation: '2024-01-23',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    transforms: [],
    AG: {
      status: 'Active',
      date: '2014-09-01',
      lastModified: null
    },
    RG: {
      status: null,
      date: '2001-09-01',
      lastModified: null
    },
    AAG: {
      status: null,
      date: '2010-09-01',
      lastModified: null
    },
    ARG: {
      status: null,
      date: '1999-09-01',
      lastModified: null
    }
  }

  const expected = {
    professional: [
      [
        "apprentice_rock_guide",
        "Inactive",
        "1999-09-01",
        "2001-08-31"
      ],
      [
        "rock_guide",
        "Inactive",
        "2001-09-01",
        "2014-08-31"
      ],
      [
        "apprentice_alpine_guide",
        "Inactive",
        "2010-09-01",
        "2014-08-31"
      ],
      [
        "alpine_guide",
        "Active",
        "2014-09-01",
        "2024-12-31"
      ]
    ]
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result).toMatchObject(expected)
})

// S.R. https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/2045
// Conversion correction case. Produce correct order and outcome for a HG membership becoming HGW even
// though the original _winter switch happened in the prior AHGW membership.
test('Conversion correction: Produces correct order and outcome for Winter Travel', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '2021-07-01',
    DateEnd: null,
    DateReinstate: null,
    LastAnnualValidation: '2024-01-30',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    transforms: [],
    AHG: {
      status: null,
      date: '2021-06-01',
      lastModified: null
    },
    HG: {
      status: 'Active',
      date: '2024-06-08',
      lastModified: '2024-06-24'
    },
    HGWT: {
      status: 'Acquired',
      date: '2021-12-01',
      lastModified: null
    }
  }

  const expected = {
    professional: [
      [
        "apprentice_hiking_guide",
        "Inactive",
        "2021-07-01",
        "2021-11-30"
      ],
      [
        "apprentice_hiking_guide_winter",
        "Inactive",
        "2021-12-01",
        "2024-06-07"
      ],
      [
        "hiking_guide_winter",
        "Active",
        "2024-06-08",
        "2024-12-31"
      ]
    ]
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result).toMatchObject(expected)
})


// TEST CASE: Resigned Member with no LastModified on the Cert but a Resigned date on the profile
// This is an example of the data transformation business rule in the schema layer
// If all the Certs.status are resigned or null and any are missing the LastModifiedDate and the ResignedDate is present on the profile
// then backfill the LastModified on each cert with that value.
// R.L. Cognito Row 1788


// TEST CASE: History Interrupted by Resign / Reinstate
// B.C. Cognito Row 296

// TODO: TEST CASE Cognito Row#561 - Resigned Member should get an inactive Wicket Membership ending in the past
// *** here is a good example of correct RESIGNED behavior to lock into a test first: Row#1965

// TODO: TEST CASE Cognito Row#2097 - Should have produced a past tier bracket
// *** #2323 has good result to lock into a test case first

// #2473 Something is up with the *Perm certs and RESIGNED
// *** #2972 non-Perm has correct behaviour

// TODO: Did not consider this one: This is a DHG with Winter Travel #83

// TODO: GOOD SAMPLE >> #2227 - Good tiers closed in past for RESIGNED Member

// TODO: #301 - Member lost standing as RG but remains active in other Scope of Practice
// I applied a fix to the member profile to set the ARG RESIGNED. Should fix the issue on next refresh. 

// #744 Perm

// #1245 https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries-TODO/1245
// HGW gets put out of order relative to HG and the Tier states are backwards

// #3075 Inactive TRCI - looks simple but gets conversion error


// TEST!!! New Rule: Filter out not only one day memberships but ones where the start date is earlier than the end date
// This can happen when a designation was issued early but the person did not join until some time later when another superseding designation was acquired
// #82 - certs before Join date result in out of sequence
// #1342 + #2975 - out of sequence dates on winter travel END before START???
// #24 + #53(similar) - wacky ASG dates - WT issue