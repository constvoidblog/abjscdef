# abjscdef
A better JavaScript CD encoder (FLAC).

Insert a CD and convert to FLAC w/full range of metadata tagging.

## goals
1. Lights out -- no typey typey
2. Multiplatform
3. Optimized for parallel processing
4. Repeatable
5. Configurable 
 
### Current State
* Cd Ripping: Functioning
* Metadata Gathering:  
    * Functioning: Album/Artist/Track/Year/Album Artwork
    * Unresolved: Genre     
* Transcoding: Functioning
* Tagging: Functioning
* Stashing: Unstarted
    * todo 
        * ftp to NAS
* Clean-up: Unstarted
    * todo options:
        * default: remove-wav, compress, archive
        * deep-clean: purge
        * remove-wav: remove src wav files
        * compress: compress cache dir
        * archive: move cache dir to an archive location (~/.abjscdef/completed/)
            * *potentially* use to identify if a cd has been ripped already, would need --ignore_archive option    
* User configuration: Unstarted
    * todo: expose configuration as code--citizen developery! put in convenient home dir spot.
* Backlog transcoding & tagging: started
    * framework in place: If any tracks have been ripped already, then those ripped tracks are a backlog...see if they need transcoding, tagging, etc. This feature will activate automatically.
    * unstarted: Once cleanup is functioning:  are there albums outside of the current album that have work left? This feature will need a command line param to avoid recycling a toxic rip->transcode into the current rip->transcode process. Post v1
* Multiple transcoders
    * Post v1

### Version Definition:
* Alpha: Unstarted capability
* Beta: Untested capability

### Version Plan
|Version|State|Cur|
|-------|-----|---|
|0.2|Linux Alpha|x|
|0.3|Linux Beta||
|0.5|OSX Alpha||
|0.6|OSX Beta||
|0.8|Windows Alpha||
|0.9|Windows Beta||
|1.0|First Release||

### Test Scenarios
1. Single Disc - CD Text, Metadata
2. Single Disc - No CD Text, Metadata
3. Single Disc - CD text, No Metadata
4. Single Disc - No CD Text, No Metadata
5. Multi Disc
6. Compiliation

# Install 
## Release 
TBD

## Ubunutu (Development)
```
$ sudo apt-get install cdparanoia flac cdtool icedax nodejs
$ git clone https://github.com/constvoidblog/abjscdef
$ cd abjscdef
$ npm install
```

### linux libs
* **cdtool** - for figuring out if a cd is in the drive. yeah, I know.
* **icedax** - for reading cd text...because cdparanoia can't.
* **cdparanoia** - cdripper...I suppose icedax has paranoia options...
* **nodejs** - the glue that holds it all together! >6.11

### npm lib dependencies
* **axios** - web service middleware
* **image-downloader** - cover art download helper
* **leven** - fuzzy text matcher (used when weiging multiple metadata options)
* **mkdirp** - deep directory creation (local)
* **wiston** - logger
* **yargs** - cmd line param helper


### npm dev lib dependencies
* **esint** - auto correct fmt
* **jshint** - improve code
 
## OSX (Development)
TBD

## Windows (Development)
TBD

# Execute
\<insert audio cd\>
```
$ node abjscdef
$ node abjscdef --help
```
