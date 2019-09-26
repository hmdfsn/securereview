/*
TODO: Take configs from user
const SERVER_GH = "github.com";
const SERVER_GL = "gitlab.com";
const HOST_GH = `https://${SERVER_GH}`;
const HOST_GL = `https://${SERVER_GL}`;
const API_GH = `https://api.${SERVER_GH}`;
const API_GL = `https://api.${SERVER_GL}`;
const RPACK = 'git-receive-pack'
const UPACK = 'git-upload-pack'
*/
const HOST_ADDR = "http://localhost:8080"
const GET_URL = "http://hmd@localhost:8080"
const PUT_URL = "http://hmd@localhost:8080/a"
const RECEIVEPACK = 'git-receive-pack'
const UPLOADPACK = 'git-upload-pack'
const authUsername = 'admin'
const authPassword = "secret"
const authEmail = 'hammad.afzali@gmail.com'
const GERRIT_MAGIC_JSON_PREFIX = ")]}\'\n"
const PGP_SIG = "gpgsig";
const PGP_START = "-----BEGIN PGP SIGNATURE-----";
const PGP_END = "-----END PGP SIGNATURE-----";

/*
https://unix.stackexchange.com/questions/450480/file-permission-with-six-bytes-in-git-what-does-it-mean
32-bit mode, split into (high to low bits)
4-bit object type
  valid values in binary are 1000 (regular file), 1010 (symbolic link)
  and 1110 (gitlink)

3-bit unused

9-bit unix permission. Only 0755 and 0644 are valid for regular files.
Symbolic links and gitlinks have value 0 in this field.

Binary			Hex	Octal	Decimal
1000 000 110100100	81A4	100644	33188	regular file
1000 000 111101101	81ED	100755	33261	regular file
1010 000 000000000	A000	120000	40960	symlink
1110 000 000000000	E000	160000	57344	gitlink
0100 000 000000000	4000	40000	16384	tree
*/
var FILEMODE = {
    "33188": "100644",
    "33261": "100755",
    "40960": "120000",
    "57344": "160000",
    "16384": "40000"
}


var auth = {
    username: authUsername,
    password: authPassword
}

var author = {
    name: authUsername,
    email: authEmail
}


// Sort an array using the path key
function comparePath(a, b) {
    // https://stackoverflow.com/a/40355107/2168416
    return compareStrings(a.path, b.path)
}


// Compare two strings
function compareStrings(a, b) {
    // https://stackoverflow.com/a/40355107/2168416
    return -(a < b) || +(a > b)
}


// Sort an array using a key (path)
function sortByName(a, b) {
    return compareStrings(a.name, b.name)
}



// Extract the parent path
function getParentPath(path) {
    // Remove everything after the last "/"
    return path.substr(0,
        path.lastIndexOf('/'));
}


// Remove the parent path
function removeParentPath(path) {
    // Split by / and take the last one
    path = path.split("/");
    return path.pop();
}


// Get a list of intermediate paths in a filepath
function getIntermediatePaths(fpath) {

    //remove the last dir from the end
    var list = [];
    while (fpath != "") {
        fpath = getParentPath(fpath);
        list.push(fpath);
    }

    return list;
}


// Find subdirs in an array of paths
function getCommonDirs(paths) {

    /* FIXME: find a better solution
     * - find subdirs
     * - remove duplicates
     */

    //get all subdirs
    var dirs = [];
    for (var i = 0; i < paths.length; i++) {
        //get intermediate paths
        var iPaths = getIntermediatePaths(paths[i])
            // concat paths to the main list
        dirs = dirs.concat(iPaths);
    }

    /*FIXME: 
     * Make sure no parent is updated before its child
     * check if sort and uniq are engough
     */

    // Remove duplicates
    // Sort by length (useful for the later comparison)
    return arrayUniq(sortByLength(dirs));
}


// Replace all finds with the update
function replaceAll(str, find, update) {
    return str.replace(new RegExp(find, 'g'), update)
}


// Replace all "/" occurrences with "%2F"
function filePathTrim(fpath) {
    return fpath.replace(/\//g, '%2F');
}


// Replace all "%2F" occurrences with "/" 
function filePathUnTrim(fpath) {
    return fpath.replace(/%2F/g, '\/');
}


// Extract everything between prefix and suffix
function extractBetween(str, prefix, suffix) {
    str = str.substring(str.indexOf(prefix) + prefix.length);
    return str.substring(0, str.indexOf(suffix));
}



// Eextract everything after last dilemma
function extractAfter(str, dilemma) {
    return str.split(dilemma)[1];
}


// Compute the difference between two arrays
function arrayDifference(arr1, arr2) {
    return arr1.filter(x => !arr2.includes(x));
}


// Compute the intersect between two arrays
function arrayIntersect(a, b) {
    return a.filter(value => -1 !== b.indexOf(value));
}


// Remove duplicate elements from an array
function arrayUniq(array) {
    return array.filter(function(element, index, self) {
        return index == self.indexOf(element);
    });
}


// Check if obj has keys
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}


// Check if an object is empty
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}


// Get values from a dictionary
function getObjetValues(dict) {
    return Object.keys(dict).map(function(key) {
        return dict[key];
    });
}


// Pick keys from an object
function selectKeys(obj, keys) {
    let selected = {}
    for (i in keys) {
        if (keys[i] in obj)
            selected[keys[i]] = obj[keys[i]]
    }

    return selected
}


// Costumize string sort by length then by dictionary order  
function sortByLength(arr) {
    return arr.sort(function(a, b) {
        return a.length - b.length || // sort by length, if equal then
            a.localeCompare(b); // sort by dictionary order
    });
}


// Sort a 2-dim-array by the 2nd column
function compareByColumn(a, b) {
    if (a[3] === b[3]) {
        return 0;
    } else {
        return (a[3] < b[3]) ? -1 : 1;
    }
}


// Convert byteArray to hex string
function toHexString(byteArray) {
    return Array.prototype.map.call(byteArray, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}


// Convert array of buffer to string
function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint16Array(buf));
}


// Parse the change URL
function getChangeNumber(changeUrl) {

    //check if url ends with "/", remove it
    if (changeUrl.endsWith('/')) changeUrl = changeUrl.slice(0, -1)

    /*
     * TODO: Find a reliable approach
     * From  <class="style-scope gr-change-view">
     */
    return changeUrl.split("+/")[1].split("/")[0]
}


/* create a buffer*/
var string_ArrayBuffer = function(str) {
    return {
        ptr: Uint16Array.from(str, function(x, i) {
            return str.charCodeAt(i)
        }),

        size: Uint16Array.from(str, function(x, i) {
            return str.charCodeAt(i)
        }).length
    }
}
