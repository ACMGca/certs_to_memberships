import { expect, test, describe } from "bun:test";
import { convertCognitoToWicket } from "../../util/convert.js";

// Case 3004 [https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/3004]
// Actual data contains a supersedence error needing correction
// This is a simple case with complete data and one simple supersedence case
test('Simple CGI1 to CGI2 Scenario', () => {

    const source = {
        DateJoined: '2023-11-03',
        DateEnd: null,
        DateReinstate: null,
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
            '2024-09-13'
          ],
          [
            'climbing_gym_instructor_level_2',
            'Active',
            '2024-09-13',
            '2025-01-31'
          ]
        ]
    }
    const result = convertCognitoToWicket(source)
    expect(result).toMatchObject(expected)
})

// Modeled after M.A. [ https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/12 ]
// Continuously active member with complete data and smooth progression through the training.
// Multiple cases of supersedence and progression from Alpine Guide to Mountain Guide with 
// a zero-duration Ski Guide (exam success).
test('Continuous Active Membership with Progression to Mountain Guide', () => {

  const source = {
    "DateJoined": "2001-09-01",
    "DateEnd": null,
    "DateReinstate": null,
    "MG": {
      "status": "Active",
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
        "2003-09-01"
      ],
      [
        "apprentice_alpine_guide",
        "Inactive",
        "2003-09-01",
        "2006-09-01"
      ],
      [
        "alpine_guide",
        "Inactive",
        "2006-09-01",
        "2009-04-01"
      ],
      [
        "apprentice_ski_guide",
        "Inactive",
        "2007-03-01",
        "2009-04-01"
      ],
      [
        "mountain_guide",
        "Active",
        "2009-04-01",
        "2025-01-31"
      ]
    ]
  }

  const result = convertCognitoToWicket(source)
  expect(result).toMatchObject(expected)
})

// Modeled after R.K. [ https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/744 ]
// This is less typical (~20 current profiles) but not uncommon for some longstanding and awarded members
test.todo('Longstanding member with incomplete but inferrable date data', () => {

  const source = {
    "DateJoined": "1978-01-01",
    "DateEnd": "2005-01-01",
    "DateReinstate": "2005-11-01",
    "MG": {
      "status": "Inactive",
      "date": null,
      "lastModified": null
    }
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

  const result = convertCognitoToWicket(source)
  expect(result).toMatchObject(expected)
})

// A.C. HG, SG, former DHG and with WT [ https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/215 ]
test.only('An Active HG+SG with DHG history and Winter Travel', () => {

  const source = {
    "DateJoined": "2007-01-01",
    "DateEnd": null,
    "DateReinstate": null,
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
        "2007-01-31" // one day before - ended by HG
      ],
      [
        "hiking_guide",
        "Inactive",
        "2007-06-01",
        "2009-04-01" // ended by the ASG
      ],
      [
        "hiking_guide_winter",
        "Active",
        "2009-04-01", // started by the ASG
        "2025-01-31"
      ],
      [
        "apprentice_ski_guide",
        "Inactive",
        "2009-04-01",
        "2021-01-01" // ended by SG
      ],
      [
        "ski_guide",
        "Active",
        "2021-01-01",
        "2025-01-31"
      ]
    ]
  }

  const result = convertCognitoToWicket(source)
  expect(result).toMatchObject(expected)
})