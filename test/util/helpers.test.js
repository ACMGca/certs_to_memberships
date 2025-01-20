import { addFortyFourMonths, cleanCognitoMyProfile } from "../../util/helpers.js";

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