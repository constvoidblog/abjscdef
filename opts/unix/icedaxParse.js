const os  = require('os');
const {AudioCompactDisc, CompactDiscTrack} = require(__app+'data/compactDisc');


/*Type: ROM, Vendor 'HL-DT-ST' Model 'DVDRAM GT30F    ' Revision 'TS08' MMC+CDDA
569344 bytes buffer memory requested, 4 buffers, 55 sectors
#icedax version 1.1.11, real time sched., soundcard, libparanoia support
Tracks:12 39:40.10
CDINDEX discid: prkkODSX5Zi30lN0og9RXESe4YM-
CDDB discid: 0x99094c0c
CD-Text: detected
CD-Extra: not detected
Album title: 'Prophets Of Rage' from 'Prophets Of Rage'
T01:       0  3:22.46 audio linear copydenied stereo title 'Radical Eyes' from 'Prophets Of Rage'
T02:   15196  4:10.16 audio linear copydenied stereo title 'Unfuck The World' from 'Prophets Of Rage'
T03:   33962  3:35.61 audio linear copydenied stereo title 'Legalize Me' from 'Prophets Of Rage'
T04:   50148  3:48.06 audio linear copydenied stereo title 'Living On The 110' from 'Prophets Of Rage'
T05:   67254  0:37.69 audio linear copydenied stereo title 'Counter Offensive' from 'Prophets Of Rage'
T06:   70098  4:08.38 audio linear copydenied stereo title 'Hail To The Chief' from 'Prophets Of Rage'
T07:   88736  3:47.29 audio linear copydenied stereo title 'Take Me Higher' from 'Prophets Of Rage'
T08:  105790  3:08.52 audio linear copydenied stereo title 'Strength In Numbers' from 'Prophets Of Rage'
T09:  119942  3:28.07 audio linear copydenied stereo title 'Fired A Shot' from 'Prophets Of Rage'
T10:  135549  3:28.36 audio linear copydenied stereo title 'Who Owns Who' from 'Prophets Of Rage'
T11:  151185  2:39.24 audio linear copydenied stereo title 'Hands Up' from 'Prophets Of Rage'
T12:  163134  3:25.01 audio linear copydenied stereo title 'Smash It' from 'Prophets Of Rage'
Leadout:  178510
Media catalog number:  888072032767
T:  1 ISRC:    USC4R1706032
T:  2 ISRC:    USC4R1706033
T:  3 ISRC:    USC4R1706034
T:  4 ISRC:    USC4R1706035
T:  5 ISRC:    USC4R1706036
T:  6 ISRC:    USC4R1706037
T:  7 ISRC:    USC4R1706038
T:  8 ISRC:    USC4R1706039
T:  9 ISRC:    USC4R1706040
T: 10 ISRC:    USC4R1706041
T: 11 ISRC:    USC4R1706042
T: 12 ISRC:    USC4R1706043

--

ype: ROM, Vendor 'HL-DT-ST' Model 'DVDRAM GT30F    ' Revision 'TS08' MMC+CDDA
569344 bytes buffer memory requested, 4 buffers, 55 sectors
#icedax version 1.1.11, real time sched., soundcard, libparanoia support
CDINDEX discid: prkkODSX5Zi30lN0og9RXESe4YM-
CDDB discid: 0x99094c0c
CD-Text: detected
CD-Extra: not detected
Album title: 'Prophets Of Rage' from 'Prophets Of Rage'
T01:  3:22.46 title 'Radical Eyes' from 'Prophets Of Rage'
T02:  4:10.16 title 'Unfuck The World' from 'Prophets Of Rage'
T03:  3:35.61 title 'Legalize Me' from 'Prophets Of Rage'
T04:  3:48.06 title 'Living On The 110' from 'Prophets Of Rage'
T05:  0:37.69 title 'Counter Offensive' from 'Prophets Of Rage'
T06:  4:08.38 title 'Hail To The Chief' from 'Prophets Of Rage'
T07:  3:47.29 title 'Take Me Higher' from 'Prophets Of Rage'
T08:  3:08.52 title 'Strength In Numbers' from 'Prophets Of Rage'
T09:  3:28.07 title 'Fired A Shot' from 'Prophets Of Rage'
T10:  3:28.36 title 'Who Owns Who' from 'Prophets Of Rage'
T11:  2:39.24 title 'Hands Up' from 'Prophets Of Rage'
T12:  3:25.01 title 'Smash It' from 'Prophets Of Rage'
Media catalog number:  888072032767

*/

function grab_first_token(l) {
    var c_pos=l.indexOf(':');

    if (c_pos>-1) {
        var token_str=l.substr(0,c_pos);
        var val_str=l.substr(c_pos+1);

        //Track data test
        if (/T\d\d/.test(token_str)){
            val_str='['+token_str+'] '+val_str;
            token_str='Track data';            
        }
        return { rv:    true,
            token: token_str,
            val:   val_str
        };
    }
    return { rv: false, token:'', val: ''};

}

//Parse icedax cd nfo output
module.exports.parse_icedax = function (i,log) { 
    //log.log('Parsing icedax output');
    var i_lst=i.split(/[\r\n]+/);
    var cd=new AudioCompactDisc();
    
    i_lst.forEach((l)=>{
        var tok=grab_first_token(l);
        tok.val=tok.val.replace(/\\'/g,'');
        switch(tok.token) {
        case 'Tracks':
            //Tracks:12 39:40.10
            var d=tok.val.split(' ',1);
            cd.track_count=d[0];
            cd.run_time=d[1];
            log.log(`${cd.track_count} tracks, ${cd.run_time} run time.`)
            break;
            
        case 'CDINDEX discid':
            //CDINDEX discid: prkkODSX5Zi30lN0og9RXESe4YM-
            cd.discid_cdindex=tok.val.trim();
            log.log(`disc id is ${cd.discid_cdindex}`);
            break;

        case 'CDDB discid':
            //CDDB discid: 0x99094c0c
            cd.discid_cddb=tok.val.trim();
            break;
            
        case 'CD-Text':
            //CD-Text: detected
            if (tok.val.trim()=='detected') {
                cd.cd_text_flag=true;                
            }
            break;
            
        case 'CD-Extra':
            //CD-Extra: not detected
            if (tok.val.trim()=='detected') {
                cd.cd_extra_flag=true;
            }
            break;
            
        case 'Album title':
            //Album title: 'Prophets Of Rage' from 'Prophets Of Rage'' 
            var parsed_title=tok.val.trim().match(/'(.*)' from '(.*)'/);
            //console.log(parsed_title);
            cd.album=parsed_title[1];
            cd.artist=parsed_title[2];

            //Uknown cd handling
            var known_cd=true;
            if (cd.album.length<1) {
                cd.album='Unknown Album';
                known_cd=false;
            }

            if (cd.artist.length<1) {
                cd.artist='Unknown Artist';
                known_cd=false;
            }
         
            if (!known_cd) {
                log.log('Uknown cd -- will need to pull metadata from online sources.');
            }

            break;
        
        case 'Leadout':
            //Leadout:  178510
            cd.leadout=tok.val.trim();            
            break;

        case 'Media catalog number':
            //Media catalog number:  888072032767
            cd.media_catalog_number=tok.val.trim(); 
            break;

        case 'Track data':
            var track_datum=tok.val.match(/\[T(\d+)\]\s+(\d+:\d+\.\d+)\s+title\s+'([^']*)' from/);
//            console.log(tok.val);
//            console.log(track_datum);
            var t=new CompactDiscTrack();
            t.idx=parseInt(track_datum[1]);
            t.duration=track_datum[2];
            t.track_title=track_datum[3];
            if (t.track_title.length<1) {
                t.track_title=`Uknown track ${t.idx}`;
            }
            cd.add_track(t);
            break;
            
        //T:
        //T##:

        }
    });

    return cd;
    
}

//things to do:
//npm init
//sudo npm install -g eslint
//eslint --init
