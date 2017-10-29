const fs = require('fs');
const path = require('path');

/** http://age.hobba.nl/audio/tag_frame_reference.html
                 * TITLE - track title
                 * ALBUM
                 * TRACKNUMBER
                 * ARTIST
                 * DATE
                 * DISCNUMBER
                 * TOTALDISCS
                 * TOTALTRACKS
                 * ENCODING
                 * MBID
                 * ASIN
                 */
 

module.exports.tag_file = function (log,o,cd,t) { 
    return new Promise((resolve,reject) => {
        //log.log(`track = ${t}`);          //DBG
        let tag_file=o.generate_flac_tag_filename(t.idx);
        //log.log(`tag file=${tag_file}`);  //DBG
        let track_count=cd.tracks.length-2;
        let tag_contents=`TITLE=${t.track_title}
ALBUM=${cd.album}
TRACKNUMBER=${t.idx}
ARTIST=${cd.artist}
DATE=${cd.release_date}
BARCODE=${cd.barcode}
ASIN=${cd.asin}
MBID=${cd.mb_release_id}
DISCNUMBER=${cd.cd_idx}
TOTALDISCS=${cd.max_cd_idx}
TOTALTRACKS=${track_count}
ENCODING=abjscdef flac -8
`;
        fs.writeFile(tag_file,tag_contents,(err)=>{
            if (err) {
                log.err(err);
                reject(err);
            }
            else {
                resolve(tag_file);
            }
        });
    });
}

