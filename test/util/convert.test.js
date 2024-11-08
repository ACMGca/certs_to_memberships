import { expect, test, describe } from "bun:test";
import { convertCognitoToWicket } from "../../util/convert.js";

// Case 3004 [https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/3004]
// Actual data contains a supersedence error needing correction
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
        "ski_guide",
        "Inactive",
        "2009-04-01", // this is legitimate as a 0 day
        "2009-04-01"  // membership as a transit to MG
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