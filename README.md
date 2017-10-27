# abjscdef
A better JavaScript CD encoder (FLAC).

Insert a CD and convert to FLAC w/full range of metadata tagging.

##goals
1. Lights out -- no typey typey
2. Multiplatform
3. Optimized for parallel processing
4. Repeatable
5. Configurable 
 
###Current State
Cd Ripping: Functioning
Metadata Gathering:  
    Functioning: Album/Artist/Track/Year Functioning
    Unstarted: Album Artwork
    Unresolved: Genre     
Transcoding: Functioning
Tagging: Unstarted
Clean-up: Unstarted
User configuration: Unstarted
Backlog transcoding & tagging: Unstarted

###Version Definition:
Alpha: Unstarted capability
Beta: Untested capability

###Version Plan
0.2 - Linux Alpha <-
0.3 - Linux Beta
0.5 - OSX Alpha
0.6 - OSX Beta
0.8 - Windows Alpha
0.9 - Windows Beta
1.0 - First Release

###Test Scenarios
1. Single Disc - CD Text, Metadata
2. Single Disc - No CD Text, Metadata
3. Single Disc - CD text, No Metadata
3. Single Disc - No CD Text, No Metadata
4. Multi Disc
5. Compiliation

#Install 
##Release 
TBD

##Ubunutu (Development)
$ sudo apt-get install cdparanoia flac cdtool icedax nodejs
$ git clone https://github.com/constvoidblog/abjscdef
$ cd abjscdef
$ npm install

##OSX (Development)
TBD

##Windows (Development)
TBD

#Execute
<insert audio cd>
$ node abjscdef
$ node abjscdef --help


