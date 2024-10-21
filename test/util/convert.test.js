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
            '2024-09-12'
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
