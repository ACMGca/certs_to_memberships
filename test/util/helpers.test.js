import { addFortyFourMonths, cleanCognitoMyProfile, splitMembershipBracket } from "../../util/helpers.js";

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
        console.log(splitTier)
        expect(splitTier).toHaveLength(1)
    })

    test('correctly DOES NOT divide a tier bracket based on a period of resignation outside the range end' ,() => {

        const tierRange = [new Date('2023-01-01T12:00:00.000Z'), new Date('2023-12-31T12:00:00.000Z')]
        const resignedRange = [new Date('2023-07-01T12:00:00.000Z'), new Date('2024-01-10T12:00:00.000Z')]

        const splitTier = splitMembershipBracket(tierRange, resignedRange)
        console.log(splitTier)
        expect(splitTier).toHaveLength(1)
    })
})