import { expect, test, describe } from "bun:test";
import { getCognitoCertificateSchema } from "../../schema/cognito_certificates_schema.js";

const cognitoCertificateSchema = getCognitoCertificateSchema()

const getPlainSample = () => {

    return {
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
            lastModified: null
        }
    }
}

test('A simple success case', () => {

    const result = cognitoCertificateSchema.safeParse(getPlainSample())
    expect(result.error).toBeUndefined()
})

test('A simple type error', () => {

    const sample = getPlainSample()
    sample.DateEnd = 0
    const result = cognitoCertificateSchema.safeParse(sample)
    expect(result.error).toBeDefined()
    expect(result.error.errors).toHaveLength(1)
    expect(result.error.errors[0].code).toEqual('invalid_type')
})

// A ReinstatementDate should always be after an EndDate
test('A ReinstateDate earlier than an EndDate should cause an error', () => {

    const sample = getPlainSample()
    sample.DateEnd = '2024-05-01'        // May is later than
    sample.DateReinstate = '2024-03-01' // March
    const result = cognitoCertificateSchema.safeParse(sample)
    expect(result.error).toBeDefined()
    expect(result.error.errors).toHaveLength(1)
    expect(result.error.errors[0].message).toEqual('Reinstatement date should be later than the End date')
})

// Having a certificate with a status but no date is an error
test('A Certificate missing a date should cause an error', () => {

    const sample = getPlainSample()
    sample.CGI2.date = null // that removes the date and should cause the error
    const result = cognitoCertificateSchema.safeParse(sample)
    expect(result.error).toBeDefined()
    expect(result.error.errors).toHaveLength(1)
    expect(result.error.errors[0].message).toEqual('Certificates with a defined status require a date')
    expect(result.error.errors[0].path).toEqual(['CGI2', 'date'])
})

// Having a certificate with an inactive or resigned status but no lastModified date is an error
test('An Inactive or Resigned Certificate missing a lastModified date should cause an error', () => {

    const sample = getPlainSample()
    sample.CGI2.status = 'Inactive'
    expect(sample.CGI2.lastModified).toEqual(null)
    const result = cognitoCertificateSchema.safeParse(sample)
    expect(result.error.errors).toHaveLength(1)
    expect(result.error.errors[0].message).toEqual('Certificates with Inactive or Resigned status require a lastModified date')
    expect(result.error.errors[0].path).toEqual(['CGI2', 'lastModified'])
})

// If certificate status is Resigned and missing the LastModifiedDate and the DateEnd is present on the profile
// then the LastModified date is backfilled with the DateEnd.
test('An Resigned Certificate missing a lastModified date should be backfilled with the DateEnd when it is available', () => {

    const sample = getPlainSample()
    sample.CGI2.status = 'Resigned'
    sample.DateEnd = '2024-06-01' // Set the DateEnd
    expect(sample.CGI2.lastModified).toEqual(null)
    const result = cognitoCertificateSchema.safeParse(sample)
    expect(result.error).toEqual(undefined)
    expect(result.data.transforms[0]).toEqual('CGI2.lastModified backfilled with DateEnd')
})

test('A Mountain Guide with no date on the certificate uses the DateJoined when available', () => {

    const sample = getPlainSample()
    delete sample.CGI1
    delete sample.CGI2
    sample.MG = {
        status: 'Active',
        date: null,
        lastModified: null
    }

    const result = cognitoCertificateSchema.safeParse(sample)
    expect(result.error).toEqual(undefined)
    expect(result.data.MG.date).toEqual(sample.DateJoined)
    expect(result.data.transforms[0]).toEqual('MG.date backfilled with DateJoined')
})

test('A Permanent Apprentice is replaced with the non-Apprentice certificate equivalent', () => {

    const perms = ['AHGPerm', 'ARGPerm', 'AAGPerm', 'ASGPerm']
    perms.forEach((permCertKey) => {

        const sample = getPlainSample()
        const regularCertKey = permCertKey.substring(0, 3)
        delete sample.CGI1
        delete sample.CGI2
        sample[permCertKey] = {
            status: 'Active',
            date: '2023-06-25',
            lastModified: null
        }

        const result = cognitoCertificateSchema.safeParse(sample)
        expect(result.error).toEqual(undefined)
        expect(result.data[permCertKey]).toBeUndefined()
        expect(result.data[regularCertKey]).toBeDefined()
        expect(result.data[regularCertKey].isPermanent).toEqual(true)
        expect(result.data.transforms.length).toEqual(2)
    })
})

test('A Permanent Apprentice is replaced with the non-Apprentice certificate equivalent and adopts the date of the regular certificate when it is otherwise missing', () => {

    const perms = ['AHGPerm', 'ARGPerm', 'AAGPerm', 'ASGPerm']
    perms.forEach((permCertKey) => {

        const sample = getPlainSample()
        const regularCertKey = permCertKey.substring(0, 3)
        delete sample.CGI1
        delete sample.CGI2
        sample[permCertKey] = {
            status: 'Active',
            date: null,
            lastModified: null
        }
        sample[permCertKey.substring(0, 3)] = {
            status: null,
            date: '2023-06-25',
            lastModified: null
        }

        const result = cognitoCertificateSchema.safeParse(sample)
        expect(result.error).toEqual(undefined)
        expect(result.data[permCertKey]).toBeUndefined()
        expect(result.data[regularCertKey]).toBeDefined()
        expect(result.data[regularCertKey].isPermanent).toEqual(true)
        expect(result.data[regularCertKey].date).toEqual('2023-06-25')
        expect(result.data.transforms.length).toEqual(3)
    })
})

test('A NON ACTIVE Permanent Apprentice is replaced with the non-Apprentice certificate equivalent but it is NOT marked as isPermanent', () => {

    const perms = ['AHGPerm', 'ARGPerm', 'AAGPerm', 'ASGPerm']
    perms.forEach((permCertKey) => {

        const sample = getPlainSample()
        const regularCertKey = permCertKey.substring(0, 3)
        delete sample.CGI1
        delete sample.CGI2
        sample[permCertKey] = {
            status: 'Inactive',
            date: '2023-06-25',
            lastModified: '2024-06-20'
        }

        const result = cognitoCertificateSchema.safeParse(sample)
        expect(result.error).toEqual(undefined)
        expect(result.data[permCertKey]).toBeUndefined()
        expect(result.data[regularCertKey]).toBeDefined()
        expect(result.data[regularCertKey].isPermanent).toBeUndefined() // This is the key: Because this Perm cert was Inactive, this is not set.
        expect(result.data.transforms.length).toEqual(2)
    })
})

test('Time limits without year values are removed', () => {

    const result = cognitoCertificateSchema.safeParse(getPlainSample())
    expect(result.error).toBeUndefined()
    const timeLimitFields = ['HikeTimeLimit', 'RockTimeLimit', 'AlpineTimeLimit', 'SkiTimeLimit']
    timeLimitFields.forEach((timeLimitField) => {

        expect(result.data[timeLimitField]).toBeUndefined()
    })
})

test('Preserves Time limits with year values', () => {

    const sample = getPlainSample()

    const timeLimitFields = ['HikeTimeLimit', 'RockTimeLimit', 'AlpineTimeLimit', 'SkiTimeLimit']
    timeLimitFields.forEach((timeLimitField) => {

        sample[timeLimitField] = '2025'
    })
    const result = cognitoCertificateSchema.safeParse(sample)
    expect(result.error).toBeUndefined()
    
    timeLimitFields.forEach((timeLimitField) => {

        expect(result.data[timeLimitField]).toEqual('2025')
    })
})