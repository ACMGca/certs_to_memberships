# cURL Samples

The work that follows is a working exploration for the purpose of improving understanding of 
the Wicket APIs. This will support more detailed exploration of the ACMG member data certificate to 
membership conversion process.

## Wicket Staging Token Service

For convenience, a Wicket Staging JWT can be created via: 

https://api.acmg.ca/admin/wicketstaging/token (assuming the correct basic authN is provided)

The returned value can then be used as the Bearer token value to the Wicket API.

( The samples that follow assume that a `WICKET_STAGING_JWT` variable is set. )

## Get Person by Member Number

The following `people` query will return a single person if the Member Number (which is the same
as the `identifying_number`) exists. This supports our ability to know if the member is already created
in Wicket Staging.

    curl -H "Authorization: Bearer $WICKET_STAGING_JWT" https://acmg-admin.staging.wicketcloud.com/api/people\?filter%5Bidentifying_number_eq%5D=974

When nothing is found for that Member Number, the `meta.page.total_items` will equal zero.

## Find a Person by PublicULID

    # Working
    curl --location --request POST 'https://acmg-admin.staging.wicketcloud.com/api/people/query' \
    --header "Authorization: Bearer $WICKET_STAGING_JWT" \
    --header 'Content-Type: application/json' \
    --data-raw '{
    "filter": {
        "membership_people_status_eq": "Active",
        "search_query": {
        "_and": [
            {
            "family_name": "Miller"
            },
            {
            "data_fields.publiculid.value.ulid": "01HGY4PCQFK9M9H517RE0Y4T3J"
            }
        ]
        }
    }
    }'

    # Working
    curl --location --request POST 'https://acmg-admin.staging.wicketcloud.com/api/people/query?include=emails,phones,addresses' \
    --header "Authorization: Bearer $WICKET_STAGING_JWT" \
    --header 'Content-Type: application/json' \
    --data-raw '{ "filter": { "membership_people_status_eq": "Active", "search_query": { "data_fields.publiculid.value.ulid": "01HGY4PCQFK9M9H517RE0Y4T3J" } } }'


## Create Person

Create a Wicket Staging Person with First (`given_name`), Last (`family_name`), Member Number (`identifying_number`), and Email.

The `identifying_number` is important. Once an ID number has been assigned in Wicket, even if that account is
later deleted, that number is not available for reuse. It was also noted that any Person records created
in the Wicket UI will auto-increment starting at the greatest used value - even if that record has been removed.
This protects against future `Record conflict` errors. 

The upshot: Because we want to use the Wicket ID number to be the ACMG Member Number, once we load a person into
platform, we don't want to delete them because they cannot be reassigned back to that Member Number again. 

    curl -H "Content-Type: application/json" \
    -H "Authorization: Bearer $WICKET_STAGING_JWT" \
    --request POST \
    https://acmg-admin.staging.wicketcloud.com/api/people \
    --data-binary @- << EOF
    {
        "data": {
            "type": "people",
            "attributes": {
            "given_name": "John",
            "family_name": "Smith",
            "identifying_number": 12345,
            "communications_double_opt_in": false,
            "user": {
                "password": "ex@mplePassword",
                "password_confirmation": "ex@mplePassword",
                "confirmed_at": "2024-11-01T00:00:00.000Z",
                "skip_confirmation_notification": true
            }
            },
            "relationships": {
            "emails": {
                "data": [
                {
                    "type": "emails",
                    "attributes": {
                    "address": "john.smith@example.com"
                    }
                }
                ]
            }
            }
        }
    }
    EOF

## Delete Person

For reasons related to the inability to reuse a once-used `identifying_number`, we won't bother
to explore the delete capability.

## Get Person Memberships

Get all the memberships for a person. 

    curl -H "Authorization: Bearer $WICKET_STAGING_JWT" https://acmg-admin.staging.wicketcloud.com/api/people/48039651-579c-40cb-9eb1-b51e8eb959f7/membership_entries

When no memberships are found for that Member, the `meta.page.total_items` will equal zero.

## Get All Wicket Membership Tiers

Before we can explore the certificate to membership conversion by creating `person_memberships`,
we need to know the UUIDs of the available Tiers. 

    curl -H "Authorization: Bearer $WICKET_STAGING_JWT" https://acmg-admin.staging.wicketcloud.com/api/person_memberships

This will return all of the configured Membership Tiers that are available (including the `slug` values). 

## Create Memberships for a Person

Create one or more memberships for a person. We can use this to explore how we will migrate 
ACMG member certificate history to become Wicket Membership history.

Note that this creates one `person_membership` at a time. To create multiple memberships
we will need to call this multiple times.

    curl -H "Content-Type: application/json" \
    -H "Authorization: Bearer $WICKET_STAGING_JWT" \
    --request POST \
    https://acmg-admin.staging.wicketcloud.com/api/person_memberships \
    --data-binary @- << EOF
    {
        "data": {
            "type": "person_memberships",
            "attributes": {
            "starts_at": "2023-01-01T00:00:00.000Z",
            "ends_at": "2024-12-31T00:00:00.000Z"
            },
            "relationships": {
            "membership": {
                "data": {
                "id": "6ce65508-dc34-4c9b-97fe-06b1b58b38e6",
                "type": "memberships"
                }
            },
            "person": {
                "data": {
                "id": "48039651-579c-40cb-9eb1-b51e8eb959f7",
                "type": "people"
                }
            }
            }
        }
    }
    EOF

## Delete Memberships for a Person

In the case that we want to remove and recreate the memberships for a person, we need
to be able to wipe out the existing memberships. 

    curl -H "Authorization: Bearer $WICKET_STAGING_JWT" \
    --request DELETE \
    https://acmg-admin.staging.wicketcloud.com/api/person_memberships/<membership-uuid>

Similar to the create operation, the delete operation affects only one `person_membership`
at a time and would need to be called multiple times. 