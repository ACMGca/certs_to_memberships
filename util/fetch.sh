#!/bin/zsh

#----
# A local `cognito_api_key` variable should be set with a valid key for the profile form
#----

# Use the Cognito Forms API to fetch all the member profiles
for id in {1..3197}; do
    echo $id
    curl -s -S -f -o ${id}.json "https://www.cognitoforms.com/api/forms/267/entries/$id?access_token=$cognito_api_key"
done
