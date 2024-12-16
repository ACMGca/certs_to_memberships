'use strict';

import { z } from 'zod'
import { CERTKEYLIST } from '../util/helpers.js';

export const getCognitoCertificateSchema = () => {

    const cognitoSchemaObject = {
        DateJoined: z.string().nullable(),
        DateEnd: z.string().nullable(),
        DateReinstate: z.string().nullable(),
        LastAnnualValidation: z.string().nullable(),
        IFMGALicenseNumber: z.string().nullable(),
        SkiExamMode: z.string().nullable()
    }

    // Define the schema for the individual certificate objects
    const certSchemaObject = z.object({
        status: z.string().nullable(),
        date: z.string().nullable(),
        lastModified: z.string().nullable()
    }).optional()

    // Add schema for each possible certificate object to the base schema
    const cognitoCertificateSchema = CERTKEYLIST.reduce((acc, cur) => {

        acc[cur] = certSchemaObject
        return acc
    }, cognitoSchemaObject)


    return z.object(cognitoCertificateSchema)
            .transform((data, ctx) => {

                // DATA_FIX_1
                // Correct for Mountain Guide profiles with no date on the MG certificate:
                // This uses the `DateJoined` value, if available, to create the start date used for the MG membership.
                if(data.MG && !data.MG.date){

                    data.MG.date = data.DateJoined
                }
                return data
            })
            .transform((data, ctx) => {

                // DATA_FIX_2
                // Correct for PERM Apprentice profiles with no date on the PERM certificate(s):
                // This uses the date from the non-apprentice value, if available, to create the start date used for the membership bracket.
                const perms = ['AHGPerm', 'ARGPerm', 'AAGPerm', 'ASGPerm']
                perms.forEach((permCert) => {

                    if(data[permCert] && !data[permCert].date && data[permCert.substring(0,3)]){

                        process.stdout.write(`fix ${data[permCert.substring(0,3)].date}\n`)
                        data[permCert].date = data[permCert.substring(0,3)].date
                        process.stdout.write(`Set ${permCert}.date to ${data[permCert].date}\n`)
                    }
                })
                return data
            })
            .superRefine((data, ctx) => {

                if(data.DateReinstate && data.DateEnd && (new Date(data.DateReinstate) < new Date(data.DateEnd))){
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Reinstatement date should be later than the End date",
                        path: ['DateReinstate']
                    })
                }

                CERTKEYLIST.forEach((certKey) => {

                    // Check for the presence of each possible certificate and raise issues:
                    if(data[certKey]){

                        // Certificate missing an issue date
                        if(['Active', 'Inactive', 'Resigned'].includes(data[certKey].status) && !data[certKey].date){

                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Certificates with Active or Inactive status require a date',
                                path: [certKey, 'date']
                            })
                        }

                        // Inactive or Resigned certificates missing lastModified date
                        // (The premise is that the certificate must have been another state before it became Inactive
                        //  or Resigned but we would be unable to detect the start date of the Inactive or Resigned status.)
                        if(['Inactive', 'Resigned'].includes(data[certKey].status) && !data[certKey].lastModified){

                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Certificates with Inactive or Resigned status require a lastModified date',
                                path: [certKey, 'lastModified']
                            })
                        }
                    }
                })
            })
}