// Get basic info about the change
function getChangeNumber(changeUrl){

	//check if url ends with "/", remove it
	if (changeUrl.endsWith('/')) changeUrl = changeUrl.slice(0,-1)
	
	/*
	* TODO: Find a reliable approach
	* From  <class="style-scope gr-change-view">
	*/
	return changeUrl.split("+/")[1].split("/")[0]
}


// Get basic info about the change
function getChangeSummary(cn, callback){

	var endpoint = "changes/?q=change:" + cn

	// fire get request to get a summary of change
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		//It returns an array of one element
		callback (parseChangeInfo(result)[0])
	})

}


// Get the head of change branch
function getRevisionCommit(change_id, revision, callback){

	// Form query
	endpoint = "changes/" + change_id + 
		"/revisions/" + revision + "/commit"

	// Fire get request to get change info
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (parseChangeInfo(result))
	})

}


// Get details about the change
function getRevisionReview(change_id, revision, callback){

	// form query
	var endpoint = "changes/" + change_id + 
		"/revisions/" + revision + "/review"

	// fire get request to get all info about the change
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (parseChangeInfo(result))
	})
	
}


// Get details about the change
function getRevisionFiles(change_id, revision, callback){

	// form query
	var endpoint = "changes/" + change_id + 
		"/revisions/" + revision + "/files"

	// fire get request to get all info about the change
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (parseChangeInfo(result))
	})	
}


// Get file content
function getFileContent(project, commitID, fname, callback){

	// Form query
	endpoint = "projects/" + project + 
		"/commits/" + commitID + "/files/" +
		 fname + "/content"

	/*endpoint = "projects/" + project + 
		"/branches/" + "master" + "/files/" +
		 fname + "/content"*/

	// Fire get request to get change info
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		console.log(atob(result))
		//callback (result)
	})

}


// Get the head of branch
function getBranchHead(project, branch, callback){

	// Form query
	endpoint = "projects/" + project + 
		"/branches/" + branch

	// Fire get request to get change info
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (parseChangeInfo(result))
	})

}


// Get the head of change branch
function getCommitInfo(project, commitID, callback){

	// Form query
	endpoint = "projects/" + project + 
		"/commits/" + commitID

	// Fire get request to get change info
	get_endpoint(HOST_ADDR, endpoint, auth, function (result){ 
		callback (parseChangeInfo(result))
	})

}


// Get the head of a branch
function getBranchInfo(project, branch, callback){

	getBranchHead(project, branch, function(result){
		// Get the details of the base branch
		getCommitInfo(project, result.revision, function(result){
			callback(result)
		});

	});
}


/**
* Populate the popup window with parent info
*/
function setParentInfo(commit) {
	
	var parent_info = '';

	parent_info += `author: ${commit.author.name} <${commit.author.email}> \n`
	parent_info += `committer: ${commit.committer.name} <${commit.committer.email}> \n`
	//parent_info += `date: ${get_standard_time(commit.author.date)}\n`
	parent_info += `date: ${commit.author.date}\n`
	parent_info += `message: ${commit.message}\n`

	/*fill the parent info form*/
	document.getElementById('parent_info').value = parent_info;
}


// Extract parents from a commit object
function extractParents (commitInfo){

	var parents = [];
	for (p in commitInfo.parents){
		parents.push(commitInfo.parents[p].commit)
	}

	return parents
}

// Extract the fpath and ref name of fetched blob
function getBlobInfo (item){
	var head = extractBetween(item, "commits/", "/files")
	var fpath = extractBetween(item, "files/", "/content")

	return [filePathUnTrim(fpath), head];
}


// Parse an array of Git objects to extract blob and trees
function objectPraser(objects, rootTreeHash, dirs){

	// Get the tree corresponding to the root directory 
	// and remove it from dirs
	let trees = {
		"":objects[rootTreeHash].content
	}

	// Changed dirs are sorted by length, in a dictionary order
	// Thus, going through changed dirs, 
	// we can make sure that parent directories are visited first
	// To do so, we take a counter and traverse the dirs
	let counter = 1
	while (dirs.length > counter){
		let dirPath = dirs[counter]
		let parent = getParentPath (dirPath)
		let dir = removeParentPath (dirPath)	
		try{
			let treeHash = trees[parent][dir].oid
			trees [dirPath] = objects[treeHash].content
		}
		catch(err) {
			console.log(err)
		}
		
		counter++;
	}

	return trees
}




