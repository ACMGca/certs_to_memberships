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
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
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
        'climbing-gym-instructor-level-1',
        'Inactive',
        '2023-11-03',
        '2024-09-12'
      ],
      [
        'climbing-gym-instructor-level-2',
        'Active',
        '2024-09-13',
        '2024-12-31'
      ]
    ],
    designations: {
      CGI1: '2023-10-01',
      CGI2: '2024-09-13'
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
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
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
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
        "apprentice-rock-guide",
        "Inactive",
        "2001-09-01",
        "2003-08-31"
      ],
      [
        "apprentice-alpine-guide",
        "Inactive",
        "2003-09-01",
        "2006-08-31"
      ],
      [
        "alpine-guide",
        "Inactive",
        "2006-09-01",
        "2009-03-31"
      ],
      [
        "apprentice-ski-guide",
        "Inactive",
        "2007-03-01",
        "2009-03-31"
      ],
      [
        "mountain-guide",
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
    ],
    designations: {
      AAG: '2003-09-01',
      AG: '2006-09-01',
      ARG: '2001-09-01',
      ASG: '2007-03-01',
      SG: '2009-04-01'
      // MG: 'was here'  << This test explicitly checks that MG has been removed from the wicket.designations
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
  expect(result.designations.MG).toBeUndefined()
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
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
    "MG": {
      "status": "Inactive",
      "date": null,
      "lastModified": null // An Inactive cert without a lastModified date is a problem that is self healed in the schema transformer
    }                      // with the rule being that it will use the latter of DateReinstate or DateEnd to backfill it.
  }

  const expected = {
    "professional": [
      [
        "mountain-guide",
        "Inactive",
        "1978-01-01",
        "2005-01-01"
      ],
      [
        "inactive-member",
        "Inactive",
        "2005-11-01",
        "2023-12-31"
      ],
      [
        "inactive-member",
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
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
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
        "day-hiking-guide",
        "Inactive",
        "2007-01-01",
        "2007-05-31" // one day before - ended by HG
      ],
      [
        "hiking-guide",
        "Inactive",
        "2007-06-01",
        "2009-03-31" // ended by the ASG -1 day
      ],
      [
        "apprentice-ski-guide",
        "Inactive",
        "2009-04-01",
        "2020-12-31" // ended by SG
      ],
      [
        "hiking-guide-winter",
        "Active",
        "2009-04-01", // started by the ASG
        "2024-12-31"
      ],
      [
        "ski-guide",
        "Active",
        "2021-01-01",
        "2024-12-31"
      ]
    ],
    designations: {
      ASG: '2009-04-01',
      DHG: '2006-09-01',
      HG: '2007-06-01',
      SG: '2021-01-01'
      // Note: Member has HGWT ***because of Ski qualifications*** hence there is no HGWT Designation to show.
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
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
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
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
        "apprentice-hiking-guide",
        "Inactive",
        "2006-09-15", // starts with the Join date because it's later than the certificate date
        "2009-03-31"  // but ends the day before the ASG certificate
      ],
      [
        "apprentice-ski-guide",
        "Active",
        "2009-04-01", // starts with the ASG date
        "2024-12-31" // ends as normal annual membership
      ],
      [
        "apprentice-hiking-guide-winter",
        "Active",
        "2009-04-01", // starts the same day as the ASG due to the enhance winter scope of practice
        "2024-12-31"  // ends as normal for the year end
      ]
    ],
    designations: {
      AHG: '2006-09-01',
      ASG: '2009-04-01'
      // Note: Member has HGWT ***because of Ski qualifications*** hence there is no HGWT Designation to show.
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
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
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
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
        "apprentice-hiking-guide",
        "Inactive",
        "2006-09-15", // starts with the Join date because it's later than the certificate date
        "2012-03-14"  // but ends the day before the WT Certificate was Acquired
      ],
      [
        "apprentice-hiking-guide-winter",
        "Active",
        "2012-03-15", // starts with the WT date
        "2024-12-31" // ends as normal annual membership
      ]
    ],
    designations: {
      AHG: '2006-09-01',
      HGWT: '2012-03-15'
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
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
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
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
        "climbing-gym-instructor-level-1",
        "Active",
        "2024-09-09",
        "2024-12-31"
      ],
      [
        "apprentice-hiking-guide",
        "Active",
        "2024-09-09",
        "2024-12-31"
      ]
    ],
    designations: {
      AHG: '2024-06-12',
      CGI1: '2022-06-01',
    }
  }
  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
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
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
    CGI1: {
      status: 'Resigned',
      date: '2015-12-01',
      lastModified: '2024-03-01'
    }
  }
  const expected = {
    "professional": [
      [
        "climbing-gym-instructor-level-1",
        "Inactive",   // The tier status is Inactive because the bracket end date is in the past
        "2016-05-01", // Starts on the DateJoined because it is after the certificate date
        "2024-03-01"  // Ends on the LastModified date
      ]
    ],
    designations: {
      CGI1: '2015-12-01'
    }
  }
  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
})

// An otherwise ACTIVE looking profile without a LastAnnualValidation value is a person who is NOT YET a member. 
// They have been set up to go through the Renewal Form but they have not yet done it. This breaks the ability to
// determine their Active Membership end date. However, it makes sense not to give them any memberships because 
// they have yet to actually join the ACMG. 
test('An Active and ready-to-join member who has not yet joined gets no Wicket Memberships', () => {

  const source = {
    ProfileStatus: 'ACTIVE', // This needs to be confirmed that an unjoined new member is ACTIVE
    DateJoined: "2024-12-18",
    DateEnd: null,
    DateReinstate: null,
    LastAnnualValidation: null,
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
    ASG: {
      status: 'Active',
      date: '2024-12-16',
      lastModified: '2024-12-16'
    }
  }
  const expected = {
    "professional": [], // An empty set indicates no Wicket Memberships as possible valid representation
    designations: {
      ASG: '2024-12-16' // However, we do expect that the designation will be retained as a past fact.
    }
  }
  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
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
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
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
        'apprentice-alpine-guide',
        'Inactive',
        '1988-01-01',
        '1993-12-31'
      ],
      [
        'mountain-guide',
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
    ],
    designations: {
      AAG: '1988-01-01'
      // MG: '1994-01-01', // There really is no such thing as a MG Designation from TAP (only AG, SG)
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
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
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
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
        "apprentice-rock-guide",
        "Inactive",
        "1999-09-01",
        "2001-08-31"
      ],
      [
        "rock-guide",
        "Inactive",
        "2001-09-01",
        "2014-08-31"
      ],
      [
        "apprentice-alpine-guide",
        "Inactive",
        "2010-09-01",
        "2014-08-31"
      ],
      [
        "alpine-guide",
        "Active",
        "2014-09-01",
        "2024-12-31"
      ]
    ],
    designations: {
      AAG: '2010-09-01',
      AG: '2014-09-01',
      ARG: '1999-09-01',
      RG: '2001-09-01',
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
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
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
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
        "apprentice-hiking-guide",
        "Inactive",
        "2021-07-01",
        "2021-11-30"
      ],
      [
        "apprentice-hiking-guide-winter",
        "Inactive",
        "2021-12-01",
        "2024-06-07"
      ],
      [
        "hiking-guide-winter",
        "Active",
        "2024-06-08",
        "2024-12-31"
      ]
    ],
    designations: {
      AHG: '2021-06-01',
      HG: '2024-06-08',
      HGWT: '2021-12-01',
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
})

// D.M. https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/913
test('Permanent Apprentice - Simple, long time ASGPerm, AAGPerm', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '1987-01-01',
    DateEnd: null,
    DateReinstate: null,
    LastAnnualValidation: '2025-01-09',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
    transforms: [],
    AAGPerm: {
      status: 'Active',
      date: '1987-01-01',
      lastModified: null
    },
    ASGPerm: {
      status: 'Active',
      date: '1988-01-01',
      lastModified: null
    }
  }

  const expected = {
    professional: [
      [
        'apprentice-alpine-guide',
        'Active',
        '1987-01-01',
        '2025-12-31'
      ],
      [
        'apprentice-ski-guide',
        'Active',
        '1988-01-01',
        '2025-12-31'
      ]
    ],
    designations: {
      AAG: '1987-01-01',
      AAGisPermanent: true,
      ASG: '1988-01-01',
      ASGisPermanent: true,
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
})

// Basic functional check for the splitting of Membership Tiers when a valid resignation period is detected.
test('CGI1 to CGI2 Scenario with resignation period', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '2023-11-03',
    DateEnd: '2024-02-15',
    DateReinstate: '2024-03-15',
    LastAnnualValidation: '2024-01-05',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
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
        'climbing-gym-instructor-level-1',
        'Inactive',
        '2023-11-03',
        '2024-02-15'
      ],
      [
        'climbing-gym-instructor-level-1',
        'Inactive',
        '2024-03-15',
        '2024-09-12'
      ],
      [
        'climbing-gym-instructor-level-2',
        'Active',
        '2024-09-13',
        '2024-12-31'
      ]
    ],
    designations: {
      CGI1: '2023-10-01',
      CGI2: '2024-09-13'
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
})


// Test the removal of climbing-gym-instructor-3 from the dataset
test('CGI1 to CGI2 Scenario with resignation period', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '2023-11-03',
    DateEnd: '2024-02-15',
    DateReinstate: '2024-03-15',
    LastAnnualValidation: '2024-01-05',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
    CGI1: {
      status: null,
      date: '2023-10-01',
      lastModified: null
    },
    CGI2: {
      status: null,
      date: '2024-09-13',
      lastModified: '2024-12-01'
    },
    CGI3: {
      status: 'Active',
      date: '2024-12-01',
      lastModified: null
    }
  }

  const expected = {
    professional: [
      [
        'climbing-gym-instructor-level-1',
        'Inactive',
        '2023-11-03',
        '2024-02-15'
      ],
      [
        'climbing-gym-instructor-level-1',
        'Inactive',
        '2024-03-15',
        '2024-09-12'
      ],
      [
        'climbing-gym-instructor-level-2',
        'Inactive',
        '2024-09-13',
        '2024-11-30'
      ],
      [
        'climbing-gym-instructor-level-2',
        'Active',
        '2024-12-01',
        '2024-12-31'
      ]
    ],
    designations: {
      CGI1: '2023-10-01',
      CGI2: '2024-09-13',
      CGI3: '2024-12-01'
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
})

// D.W. https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/1576
// RG + CGI3 with resignation period.
test('CGI3 correction and multiple effects to support resignation period', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '2002-11-01',
    DateEnd: '2005-03-01',
    DateReinstate: '2009-01-01',
    LastAnnualValidation: '2024-12-31',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
    transforms: [],
    RG: {
      status: 'Active',
      date: '2009-09-01',
      lastModified: null
    },
    ARG: {
      status: null,
      date: '2004-09-01',
      lastModified: null
    },
    CGI1: {
      status: null,
      date: '2002-11-01',
      lastModified: null
    },
    CGI2: {
      status: null,
      date: '2003-04-01',
      lastModified: null
    },
    CGI3: {
      status: 'Active',
      date: '2006-09-01',
      lastModified: null
    }
  }

  const expected = {
    professional: [
      [
        'climbing-gym-instructor-level-1',
        'Inactive',
        '2002-11-01',
        '2003-03-31'
      ],
      [
        'climbing-gym-instructor-level-2',
        'Inactive',
        '2003-04-01',
        '2005-03-01'
      ],
      [
        'apprentice-rock-guide',
        'Inactive',
        '2004-09-01',
        '2005-03-01'
      ],
      [
        'apprentice-rock-guide',
        'Inactive',
        '2009-01-01',
        '2009-08-31'
      ],
      [
        'climbing-gym-instructor-level-2',
        'Active',
        '2009-01-01',
        '2025-12-31'
      ],
      [
        'rock-guide',
        'Active',
        '2009-09-01',
        '2025-12-31'
      ]
    ],
    designations: {
      CGI1: '2002-11-01',
      CGI2: '2003-04-01',
      ARG: '2004-09-01',
      CGI3: '2006-09-01',
      RG: '2009-09-01'
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
})

// C.H. https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/561
// Resigned member showing AHG Membership ending in the past.
test('Resigned member showing AHG Membership ending in the past', () => {

  const source = {
    ProfileStatus: 'RESIGNED',
    DateJoined: '2017-07-01',
    DateEnd: null,
    DateReinstate: null,
    LastAnnualValidation: '2023-01-01',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
    AHG: {
      status: 'Resigned',
      date: '2017-06-01',
      lastModified: '2024-03-01'
    }
  }

  const expected = {
    professional: [
      [
        'apprentice-hiking-guide',
        'Inactive',
        '2017-07-01',
        '2024-03-01'
      ]
    ],
    designations: {
      AHG: '2017-06-01'
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
})


// S.R. #1245 https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/1245
// Good example of simple, explicit HGWT.
test('Simple, explicit hiking guide winter travel example', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '2021-07-01',
    DateEnd: null,
    DateReinstate: null,
    LastAnnualValidation: '2025-01-03',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
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
        'apprentice-hiking-guide',
        'Inactive',
        '2021-07-01',
        '2021-11-30'
      ],
      [
        'apprentice-hiking-guide-winter',
        'Inactive',
        '2021-12-01',
        '2024-06-07'
      ],
      [
        'hiking-guide-winter',
        'Active',
        '2024-06-08',
        '2025-12-31'
      ]
    ], designations: {
      AHG: '2021-06-01',
      HG: '2024-06-08',
      HGWT: '2021-12-01'
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
})

// J.S. #1410 https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/1410
// Formal Review Test Case
// Good sample as identified by K.D. during formal conversion review process
// https://www.cognitoforms.com/acmg/wicketmembershipconversionreview/1-all-entries/3
test('Row 1410 - Formal Review Test Case', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '2003-11-01',
    DateEnd: null,
    DateReinstate: null,
    LastAnnualValidation: '2024-12-02',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
    transforms: [
      'Added AHG: status,Active | date,2017-07-01 | lastModified, | isPermanent,true',
      'Removed AHGPerm: status,Active | date,2017-07-01 | lastModified,'
    ],
    DHG: {
      status: 'Active',
      date: '2006-09-01',
      lastModified: null
    },
    CGI1: {
      status: 'Active',
      date: '2003-11-01',
      lastModified: null
    },
    TRCI: {
      status: 'Active',
      date: '2006-04-01',
      lastModified: null
    },
    AHG: {
      status: 'Active',
      date: '2017-07-01',
      lastModified: null,
      isPermanent: true
    }
  }

  const expected = {
    professional: [
      [
        'climbing-gym-instructor-level-1',
        'Active',
        '2003-11-01',
        '2025-12-31'
      ],
      [
        'top-rope-climbing-instructor',
        'Active',
        '2006-04-01',
        '2025-12-31'
      ],
      [
        'day-hiking-guide',
        'Active',
        '2006-09-01',
        '2025-12-31'
      ],
      [
        'apprentice-hiking-guide',
        'Active',
        '2017-07-01',
        '2025-12-31'
      ]
    ],
    designations: {
      CGI1: '2003-11-01',
      TRCI: '2006-04-01',
      DHG: '2006-09-01',
      AHG: '2017-07-01',
      AHGisPermanent: true
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
})

// D.K. #708 https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/708
// Formal Review Test Case
// Good sample as identified by K.D. during formal conversion review process
// https://www.cognitoforms.com/acmg/wicketmembershipconversionreview/1-all-entries/5
test('Row 708 - Formal Review Test Case', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '2001-09-01',
    DateEnd: '2007-06-30',
    DateReinstate: '2007-09-24',
    LastAnnualValidation: '2024-12-08',
    IFMGALicenseNumber: '512',
    SkiExamMode: 'Ski',
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
    transforms: [],
    MG: {
      status: 'Active',
      date: '2019-08-01',
      lastModified: null
    },
    SG: {
      status: null,
      date: '2012-04-01',
      lastModified: null
    },
    AAG: {
      status: null,
      date: '2012-08-01',
      lastModified: null
    },
    ASG: {
      status: null,
      date: '2009-04-01',
      lastModified: null
    },
    ARG: {
      status: null,
      date: '2007-09-01',
      lastModified: null
    },
    CGI1: {
      status: null,
      date: '2001-09-01',
      lastModified: null
    },
    CGI2: {
      status: null,
      date: '2002-04-01',
      lastModified: null
    },
    CGI3: {
      status: 'Inactive',
      date: '2003-04-01',
      lastModified: '2024-01-31'
    }
  }

  const expected = {
    professional: [
      [
        'climbing-gym-instructor-level-1',
        'Inactive',
        '2001-09-01',
        '2002-03-31'
      ],
      [
        'climbing-gym-instructor-level-2',
        'Inactive',
        '2002-04-01',
        '2003-03-31'
      ],
      [
        'climbing-gym-instructor-level-2',
        'Inactive',
        '2003-04-01',
        '2007-06-30'
      ],
      [
        'climbing-gym-instructor-level-2',
        'Inactive',
        '2007-09-24',
        '2024-01-31'
      ],
      [
        'apprentice-rock-guide',
        'Inactive',
        '2007-09-24',
        '2012-07-31'
      ],
      [
        'apprentice-ski-guide',
        'Inactive',
        '2009-04-01',
        '2012-03-31'
      ],
      [
        'ski-guide',
        'Inactive',
        '2012-04-01',
        '2019-07-31'
      ],
      [
        'apprentice-alpine-guide',
        'Inactive',
        '2012-08-01',
        '2019-07-31'
      ],
      [
        'mountain-guide',
        'Active',
        '2019-08-01',
        '2025-12-31'
      ],
      [
        'ifmga',
        'Active',
        '2019-08-01',
        '2025-12-31'
      ]
    ],
    designations: {
      CGI1: '2001-09-01',
      CGI2: '2002-04-01',
      CGI3: '2003-04-01',
      ARG: '2007-09-01',
      ASG: '2009-04-01',
      SG: '2012-04-01',
      AAG: '2012-08-01'
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
})

// G.L. #776 https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/776
// Formal Review Test Case
// Good sample as identified by K.D. during formal conversion review process
// https://www.cognitoforms.com/acmg/wicketmembershipconversionreview/1-all-entries/9
test('Row 776 - Formal Review Test Case', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '2018-03-01',
    DateEnd: '2020-04-01',
    DateReinstate: '2020-05-01',
    LastAnnualValidation: '2025-01-08',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
    transforms: [],
    CGI1: {
      status: null,
      date: '2018-01-01',
      lastModified: null
    },
    CGI2: {
      status: 'Active',
      date: '2019-02-01',
      lastModified: null
    }
  }

  const expected = {
    professional: [
      [
        'climbing-gym-instructor-level-1',
        'Inactive',
        '2018-03-01',
        '2019-01-31'
      ],
      [
        'climbing-gym-instructor-level-2',
        'Inactive',
        '2019-02-01',
        '2020-04-01'
      ],
      [
        'climbing-gym-instructor-level-2',
        'Active',
        '2020-05-01',
        '2025-12-31'
      ]
    ],
    designations: {
      CGI1: '2018-01-01',
      CGI2: '2019-02-01'
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
})


// M.W. #1520 https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/1520
// Formal Review Test Case
// Good sample as identified by D.W. during formal conversion review process
// https://www.cognitoforms.com/acmg/wicketmembershipconversionreview/1-all-entries/11
test('Row 1520 - Formal Review Test Case', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '2008-08-01',
    DateEnd: null,
    DateReinstate: null,
    LastAnnualValidation: '2024-12-08',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
    transforms: [],
    AHG: {
      status: null,
      date: '2008-08-01',
      lastModified: null
    },
    DHG: {
      status: null,
      date: '2008-08-01',
      lastModified: null
    },
    HG: {
      status: 'Active',
      date: '2014-09-01',
      lastModified: null
    },
    HGWT: {
      status: 'Acquired',
      date: '2016-10-01',
      lastModified: null
    }
  }

  const expected = {
    professional: [
      [
        'apprentice-hiking-guide',
        'Inactive',
        '2008-08-01',
        '2014-08-31'
      ],
      [
        'day-hiking-guide',
        'Inactive',
        '2008-08-01',
        '2014-08-31'
      ],
      [
        'hiking-guide',
        'Inactive',
        '2014-09-01',
        '2016-09-30'
      ],
      [
        'hiking-guide-winter',
        'Active',
        '2016-10-01',
        '2025-12-31'
      ]
    ],
    designations: {
      AHG: '2008-08-01',
      DHG: '2008-08-01',
      HG: '2014-09-01',
      HGWT: '2016-10-01'
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
})


// W.R. #3219 https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/3219
// Formal Review Test Case
// Good sample as identified by A.T. during formal conversion review process
// https://www.cognitoforms.com/acmg/wicketmembershipconversionreview/1-all-entries/14
test('Row 3219 - Formal Review Test Case', () => {

  const source = {
    ProfileStatus: 'ACTIVE',
    DateJoined: '2025-01-15',
    DateEnd: null,
    DateReinstate: null,
    LastAnnualValidation: '2025-01-22',
    IFMGALicenseNumber: '0',
    SkiExamMode: 'Ski',
    HikeTimeLimit: 'No',
    RockTimeLimit: 'No',
    AlpineTimeLimit: 'No',
    SkiTimeLimit: 'No',
    transforms: [],
    TRCI: {
      status: 'Active',
      date: '2024-05-13',
      lastModified: '2024-05-13'
    }
  }

  const expected = {
    professional: [
      [
        'top-rope-climbing-instructor',
        'Active',
        '2025-01-15',
        '2025-12-31'
      ]
    ],
    designations: {
      TRCI: '2024-05-13'
    }
  }

  const parsedSource = cognitoCertificateSchema.safeParse(source)
  expect(parsedSource.error).toEqual(undefined)
  const result = convertCognitoToWicket(parsedSource.data)
  expect(result.professional).toMatchObject(expected.professional)
  expect(result.designations).toMatchObject(expected.designations)
})


// BUG: #887 - should be AHGW because of the ASG cert

// !!!TODO IMPORTANT - Write a test about an Apprentice with a yyyy TimeLimit value that Mike has adjusted beyond the expected 3 years
// and determine how to detect and express this as an explicit TimeLimitDateExtension value.