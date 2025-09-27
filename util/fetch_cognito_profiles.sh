#!/bin/zsh

#----
# A local `cognito_api_key` variable should be set with a valid key for the profile form
# Note that the Cognito API will rate limit after 200-300 requests and return HTTP::429 
# or HTTP::500. Basic protections are built into the script.
#----

# Use the Cognito Forms API to fetch all the member profiles
# was up to 3227

request_counter=0
for id in {1..3310}; do

    request_counter=$((request_counter + 1))
    
    while true; do

        if (( ($request_counter) % 250 == 0 )); then

            echo "[$(date)] Proactive 5 minute sleep to avoid rate limiting..."
            sleep 300
        fi

        status_code=$(curl -s -S -f -o ./profile_data/${id}.json -w "%{http_code}" "https://www.cognitoforms.com/api/forms/267/entries/$id?access_token=$cognito_api_key")


        if [[ "$status_code" == "429" || "$status_code" == "500" ]]; then
            echo "($request_counter) $id >> $status_code"
            echo "Backing off due to rate limiting... Sleep for 5 minutes."
            sleep 300
        elif [[ "$status_code" == "200" ]]; then
            echo "($request_counter) $id >> $status_code"

            # On each successful profile download, parse the profile and download 
            # associated photo and first aid certs which the URL tokens are fresh
            bun util/fetchMemberfiles.js ./profile_data/${id}.json
            break
        else
            echo "($request_counter) $id >> $status_code"
            break
        fi
    done
done
