#!/bin/zsh

#----
# A local `cognito_api_key` variable should be set with a valid key for the profile form
# Note that the Cognito API will rate limit after 200-300 requests and return HTTP::429 
# or HTTP::500. Basic protections are built into the script.
#----

# Use the Cognito Forms API to fetch all the member profiles
# was up to 3179

request_counter=0
for id in {3137,3002,1718,1514,1502,1459,1432,1398,1377,1334,1286,1265,1067,1052,943,858,840,794,780,723,636,628,622,588,564,499,477,442,382,358,301,296,249,237,228,203,196,145,116,91,83,22,13,7}; do

    request_counter=$((request_counter + 1))
    
    while true; do

        if (( ($request_counter) % 250 == 0 )); then

            echo "Proactive 5 minute sleep to avoid rate limiting..."
            sleep 300
        fi

        status_code=$(curl -s -S -f -o ./profile_data/${id}.json -w "%{http_code}" "https://www.cognitoforms.com/api/forms/267/entries/$id?access_token=$cognito_api_key")


        if [[ "$status_code" == "429" || "$status_code" == "500" ]]; then
            echo "($request_counter) $id >> $status_code"
            echo "Backing off due to rate limiting... Sleep for 5 minutes."
            sleep 300
        else
            echo "($request_counter) $id >> $status_code"
            break
        fi
    done
done
