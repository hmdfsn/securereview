// TODO: Remove global variables
// Cache objects and commitInfo temporarily
var finalObjects = [];
var commitInfo;

/**
 * Submit merge request:
 *  - compare target and change branches
 *  - update the bottom tree in the target branch
 *  - propagate the update to the root tree
 *  - computet the root tree hash and then new commit
 */
function run(url) {

    // Get change number
    var cn = getChangeNumber(url)
    // Get a summary of change
    getChangeSummary(cn, (result) => {
        // Cache some info to use later
        commitInfo = result;

        let project = result.project;
        let branch = result.branch;
        let change_id = result.change_id;
        let changeNumber = result._number

        //TODO: sync the following API calls
        // Get info: change branch
        getRevisionReview(change_id, "current", (changeInfo) => {
            //Get the number of patches in the change branch
            revisions = getObjetValues(changeInfo.revisions)[0]._number;

            //Get commits in the change branch
            let urls = formRevisionUrls(change_id, revisions);
            multiFetch({
                urls,
                parser: revisionParser
            }, ({
                data
            }) => {
                // Form Commit objects in the change branch
                // All new commits should be part of the packfile
                let revCommits = getObjetValues(data)
                let commitObjects = createRevisionCommits(revCommits);

                //ExtractReviews from the commit message
                let commitMessage = formCommitMessage(revCommits);
                //Amend change ID to the commit message
                commitMessage = `Merge #${changeNumber}: ${
			commitInfo.subject}\n\n${
			commitMessage}Change-Id: ${change_id}`;

                // Get info about the target branch
                getBranchInfo(project, branch, (targetInfo) => {

                    // Populate the parent window
                    setParentInfo(targetInfo);

                    // Form parents, Common ancestor is parent of the 1st revision
                    let {
                        parents
                    } = formParents(changeInfo, data[1], targetInfo);

                    // Run the merge process
                    runMergeProcess(change_id, project, parents,
                        (treeHash, objects) => {
                            //Update new objects
                            finalObjects = [...objects, ...commitObjects]
                            //Form parents to create commit
                            parents = [parents.targetHead, parents.changeHead]
                            commitInfo["parents"] = parents;

                            prepareCommit({
                                parents,
                                treeHash,
                                commitMessage
                            });
                        });
                });

            });

        });

    });
}

function pushCommit() {

    // Create final Git commit object
    let commit = document.getElementById(COMMITBOX_ID).value;
    let type = "commit";
    let obj = createGitObject(type, commit);
    finalObjects.push([type, obj.object]);

    let parents = commitInfo.parents;
    let repo_url = `${HOST_ADDR}/${commitInfo.project}`;

    // Push the commit to the server
    pushObjects({
            auth,
            repo_url,
            branch: commitInfo.branch,
            oldHead: parents[0],
            newHead: obj.id,
            objects:finalObjects
        },
        (result) => {
            //TODO: Prase the response and take action
            //parseSendPackResult (result)
            console.log(result);
        });
}


// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    chrome.tabs.query({
            active: true,
            currentWindow: true
        },
        function(tabs) {
            url = tabs[0].url;
            run(url);
        });

    //Push the signed merge commit to the server
    document.getElementById('merge_change').addEventListener(
        'click', pushCommit);
});
