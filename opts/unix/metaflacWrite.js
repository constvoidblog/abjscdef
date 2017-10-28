const fs = require('fs');

const temp = require('temp');

module.exports.tag_file = function (log,cd,t) { 
    return new Promise((resolve,reject) => {
        temp.track();
        var prefix=`${cd.mb_release_id}_${t}`;
        temp.open(prefix,(err,temp_f)=>{
            if (err) {
                log.err(`tmp file ${prefix} had issue`);
                log.err(err);
                reject(err);
            }
            else {
                let track_data=cd.tracks[t];
                let tag_contents=`TITLE=${track_data.title}
TITLE=${track_data.title}
ALBUM=${cd.album}
TRACKNUMBER=${t}
ARTIST=${cd.artist}
DATE=${cd.release_date}
BARCODE=${cd.barcode}
ASIN=${cd.asin}
MBID=${cd.mb_release_id}
DISCNUMBER=${cd.cd_idx}
TOTALDISCS=${cd.max_cd_idx}
TOTALTRACKS=${cd.track_count}
ENCODING=abjscdef flac -8
`;
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
                fs.write(temp_f.fd,tag_contents,(err)=>{
                    if (err) {
                        log.err(`couldn't write tmp file ${prefix}`);
                        log.err(err);
                        reject(err);
                    }
                });
                fs.close(temp_f.fd, (err)=>{
                    if (err) {
                        log.err(`couldn't close tmp file ${prefix}`);
                        log.err(err);
                        reject(err);
                    }
                    else {
                        resolve(temp_f.path);
                    }
                });
            }
        });
    });
};