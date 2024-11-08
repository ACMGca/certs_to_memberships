'use strict';

import { z } from 'zod'
import { CERTKEYLIST } from '../util/helpers.js';

export const getCognitoCertificateSchema = () => {

    const cognitoSchemaObject = {
        DateJoined: z.string().nullable(),
        DateEnd: z.string().nullable(),
        DateReinstate: z.string().nullable(),   
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