import { addFortyFourMonths, cleanCognitoMyProfile, splitMembershipBracket, convertTimeLimit } from "../../util/helpers.js";

import { describe, expect, test } from "bun:test";

test('Can add 44 months to a date', () => {

    const startDate = new Date('2025-01-07T00:00:00.000Z')
    const expectedDate = 'Thu Sep 07 2028 00:00:00 GMT+0000 (Coordinated Universal Time)'
    const result = `${addFortyFourMonths(startDate)}`
    expect(result).toEqual(expectedDate)
})

test('Throws a type error if a Date is not provided when adding 44 months', () => {

    const startDate = null
    const t = () => {

        addFortyFourMonths(startDate)
    }
    expect(t).toThrow(TypeError)
    expect(t).toThrow('Input must be a Date to add 44 months to it.')
})

describe('Cognito profile simplification', () => {

    test('produces a simple formatted string with the expected data', async () => {

        const profileFile = Bun.file(`./profile_data/974.json`);
        const profile = await profileFile.json();
        const cleanedProfile = cleanCognitoMyProfile(profile)
        expect(cleanedProfile.split('\n')).toHaveLength(94)
    })

})

describe('Membership tier splitting', () => {

    test('correctly divides a tier bracket based on a period of resignation' ,() => {

        const tierRange = [new Date('2023-01-01T12:00:00.000Z'), new Date('2023-12-31T12:00:00.000Z')]
        const resignedRange = [new Date('2023-06-01T12:00:00.000Z'), new Date('2023-07-31T12:00:00.000Z')]

        const splitTier = splitMembershipBracket(tierRange, resignedRange)
        expect(splitTier).toHaveLength(2)
    })

    test('correctly DOES NOT divide a tier bracket based on a period of resignation completely outside the range' ,() => {

        const tierRange = [new Date('2023-01-01T12:00:00.000Z'), new Date('2023-12-31T12:00:00.000Z')]
        const resignedRange = [new Date('2024-06-01T12:00:00.000Z'), new Date('2024-07-31T12:00:00.000Z')]

        const splitTier = splitMembershipBracket(tierRange, resignedRange)
        expect(splitTier).toHaveLength(1)
    })

    test('correctly DOES NOT divide a tier bracket based on a period of resignation outside the range start' ,() => {

        const tierRange = [new Date('2023-01-01T12:00:00.000Z'), new Date('2023-12-31T12:00:00.000Z')]
        const resignedRange = [new Date('2022-12-25T12:00:00.000Z'), new Date('2023-07-31T12:00:00.000Z')]

        const splitTier = splitMembershipBracket(tierRange, resignedRange)
        expect(splitTier).toHaveLength(1)
    })

    test('correctly DOES NOT divide a tier bracket based on a period of resignation outside the range end' ,() => {

        const tierRange = [new Date('2023-01-01T12:00:00.000Z'), new Date('2023-12-31T12:00:00.000Z')]
        const resignedRange = [new Date('2023-07-01T12:00:00.000Z'), new Date('2024-01-10T12:00:00.000Z')]

        const splitTier = splitMembershipBracket(tierRange, resignedRange)
        expect(splitTier).toHaveLength(1)
    })
})

describe('Apprentice Time Limits helper', () => {

    test('returns null when either designationDate or timeLimit year are not available', () => {

        const timeLimitResult = convertTimeLimit('2023-09-15', null)
        expect(timeLimitResult).toEqual(null)

        const timeLimitResult2 = convertTimeLimit('2023-09-15', null)
        expect(timeLimitResult2).toEqual(null)
    })

    test('throws an error if either of the inputs are in a bad format', () => {

        expect(() => { convertTimeLimit('2023-09-15', 'abcd') }).toThrow('timeLimitYear must be a 4 digit string year [yyyy]')
        expect(() => { convertTimeLimit('2023-09-15', 2023) }).toThrow('timeLimitYear must be a 4 digit string year [yyyy]')
        expect(() => { convertTimeLimit('2023-09', '2026') }).toThrow('designationDate must be an ISO format date string [yyyy-MM-dd]')
    })


    test('returns null when there is no indication of a time extension', () => {

        const result = convertTimeLimit('2023-09-15', '2026')

        expect(result).toEqual(null)
    })

    test('returns an ISO date string when there is a time extension indicated', () => {

        const result = convertTimeLimit('2023-09-15', '2027')

        expect(result).toEqual('2027-09-15')
    })
})