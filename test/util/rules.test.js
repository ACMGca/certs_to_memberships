import { z } from "zod";
import { expect, test, describe } from "bun:test";
import { rules } from "../../util/rules.js";
import { CERTKEYLIST } from "../../util/helpers.js";

const certRuleSchema = z.object({
    supervises: z.array(z.string()).min(0),
    supersedes: z.array(z.string()).min(0),
    eligible: z.array(z.object({}).passthrough()).min(1),
    superseded_by: z.array(z.string()).min(0),
    membership_tier_slug: z.string()
})

describe('Rules structure', () => {

    test('is an object', () => {

        expect(typeof rules).toEqual('object')
    })

    test("includes all expected certificate keys (exceptions: ['HGWT','AHGPerm','AAGPerm','ASGPerm','ARGPerm'])", () => {

        const ruleKeyList = Object.keys(rules)
        // These are the 'certificate' identifiers we're trying to leave behind
        const exceptions = ['HGWT','AHGPerm','AAGPerm','ASGPerm','ARGPerm']
        CERTKEYLIST.forEach((key) => {

            expect(ruleKeyList.includes(key) || exceptions.includes(key)).toEqual(true)
        })
    })

    test("is valid and does not include unexpected certificate keys (exceptions: ['AHGW','HGW','IFMGA'])", () => {

        const ruleKeyList = Object.keys(rules)
        // These are the new Scope of Practice labels we want to introduce
        // (NOTE: TODO - IFMGA seems misplaced in this. It is possible that it is another type or Membership that
        //               stands alone and independent of MG. *This requires further discussion*.)
        const exceptions = ['AHGW','HGW','IFMGA']
        ruleKeyList.forEach((key) => {

            const parsed = certRuleSchema.safeParse(rules[key])
            expect(parsed.success).toEqual(true)
            expect(parsed.error).toEqual(undefined)
            expect(typeof parsed.data).toEqual('object')
            expect(CERTKEYLIST.includes(key) || exceptions.includes(key)).toEqual(true)
        })
    })
})