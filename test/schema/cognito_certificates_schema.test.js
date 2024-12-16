import { expect, test, describe } from "bun:test";
import { getCognitoCertificateSchema } from "../../schema/cognito_certificates_schema.js";

const cognitoCertificateSchema = getCognitoCertificateSchema()

const getPlainSample = () => {

    return {
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
    expect(result.error.errors[0].message).toEqual('Certificates with Active or Inactive status require a date')
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