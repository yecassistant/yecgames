/* Eros'un Oku – ok bulmacası */
(function () {
  "use strict";
  var LEVELS = [{"w":4,"h":4,"a":["1,0:DD","0,3:RR","3,0:D"]},{"w":5,"h":5,"a":["0,2:R","2,3:UU","2,4:R","1,3:D","0,3:D","3,3:U","4,1:DD","1,1:UR","3,1:U","0,1:U"]},{"w":5,"h":6,"a":["1,2:DD","2,2:R","1,5:LUU","0,2:UR","2,1:RRD","2,4:DRR","2,3:RR","1,0:L","3,4:R","2,0:R"]},{"w":6,"h":7,"a":["0,6:URR","2,3:DR","4,2:DD","3,2:D","4,6:L","1,3:DL","3,5:RRD","4,1:LLD","2,0:LDD","5,4:UUU","5,0:LL","0,2:D","0,0:D"]},{"w":6,"h":7,"a":["2,5:UUL","5,4:LL","3,5:DR","4,5:RD","0,1:DDD","3,1:D","1,1:D","1,4:DDL","3,3:R","3,0:RDD","1,0:RD","5,1:DD"]},{"w":7,"h":8,"a":["3,2:ULDL","0,3:RRRR","2,0:R","3,4:RDD","6,0:DLDD","3,7:LUUU","0,1:R","4,0:D","0,7:UUUR","6,7:UUUU","5,4:DDD","1,7:UU","0,0:R"]},{"w":7,"h":8,"a":["4,5:U","4,2:DLD","3,5:LU","6,4:UUU","3,6:RRU","5,4:UUUL","2,1:LDDD","3,2:UUL","0,6:RRDR","1,5:LUU","4,7:R","4,0:RR","6,7:U","1,7:L","0,2:UU"]},{"w":7,"h":8,"a":["4,3:DLLU","4,1:LDD","2,2:UURR","2,5:R","1,5:D","5,0:DDDD","5,5:LDLL","1,3:D","0,4:DDDR","0,2:R","0,0:RD","6,3:DDDD","5,6:D","6,0:DD"]},{"w":7,"h":8,"a":["4,7:LUUU","3,3:LU","3,2:ULL","1,4:UULU","2,5:U","1,7:RULU","4,4:UU","0,7:UUU","5,4:DDD","6,0:DDLD","6,7:UUU","2,0:RRDR","0,0:R"]},{"w":7,"h":8,"a":["4,6:RULL","2,7:UUUR","3,7:U","6,2:DDD","4,4:RUUU","5,7:L","0,7:UUUR","2,2:DL","4,0:DDD","3,2:UU","1,7:UU","0,1:DD","1,2:UUL","2,0:D","6,6:D","6,0:D"]},{"w":7,"h":9,"a":["3,7:UUUU","3,0:LDD","2,4:UL","3,2:URRU","4,3:URD","1,4:LU","1,2:UUL","4,4:DDRR","6,4:L","2,5:LL","6,5:L","2,6:D","6,2:D","3,8:LLUU","6,0:D","4,7:DRUR","0,8:UU"]},{"w":7,"h":9,"a":["2,2:DD","1,3:DD","2,6:RUU","3,3:URD","1,2:L","4,4:DDDL","6,0:DLLL","6,5:UUUL","6,7:ULUU","0,3:DDDD","2,0:R","1,0:D","2,7:LDL","0,0:D","6,8:LU"]},{"w":7,"h":9,"a":["4,5:L","4,2:DD","4,6:RR","3,6:LUUU","6,2:LDDD","3,4:UUL","1,7:RRR","5,7:D","1,4:UUUR","0,8:RRRR","1,0:RRDR","0,6:RU","0,2:DDD","6,8:U","5,0:D","6,1:U","0,1:U"]},{"w":7,"h":9,"a":["4,3:LLLL","3,4:DD","4,4:DDDL","1,2:RRR","1,4:LDDD","5,3:D","1,7:UURU","1,0:LDRR","6,2:UU","3,1:RRU","0,8:RRU","6,4:DDLD","5,8:LL","6,8:U"]},{"w":7,"h":9,"a":["2,4:DDL","2,1:RDD","2,3:LUUU","4,7:UUU","0,5:RU","3,4:D","6,3:LL","4,2:U","6,7:LUUU","5,8:LLUL","0,3:UUU","6,2:L","5,0:LLL","6,0:DL","1,8:U","0,8:UU"]},{"w":7,"h":9,"a":["3,3:DD","0,1:DDRR","2,4:DDR","2,2:ULUL","6,2:LLL","1,4:DDD","2,0:R","4,3:DDDD","0,6:UU","3,1:RU","5,8:LLUL","5,3:DDDR","6,0:LD","2,8:LL","6,8:U"]},{"w":7,"h":9,"a":["3,4:RR","6,4:DLLL","5,6:LL","6,3:LLL","1,4:DD","0,7:RRUU","2,4:UU","3,7:DLLL","0,1:DRD","3,2:UUL","6,1:DLL","6,8:LLUR","6,0:LDL","2,1:LUL"]},{"w":7,"h":9,"a":["0,2:DRR","2,4:RRU","3,3:UURR","2,2:UURR","4,2:RRUU","0,0:DRD","0,4:RDRD","3,8:UUU","4,6:U","6,3:LD","0,6:R","6,4:DLDD","0,7:RR","6,8:LLU","0,8:RR"]},{"w":7,"h":9,"a":["3,5:RDDR","3,6:DDRR","5,5:DRDD","0,4:RD","2,6:DL","6,2:DLL","5,4:LL","2,5:UUU","6,1:LDLL","1,6:LDD","6,0:LLDL","2,1:LDDL","2,0:R","0,0:DD"]},{"w":7,"h":9,"a":["3,4:DL","1,5:D","1,4:LDDD","0,3:RRR","0,8:RURR","4,4:UUUU","6,2:DDL","5,5:RDDD","1,2:RR","4,8:U","2,6:RRRD","1,1:RUR","0,2:UU","6,0:LDDD"]},{"w":8,"h":11,"a":["4,5:RRRULLLL","5,6:LLU","1,5:DRUU","0,7:UUURURR","1,8:URR","2,2:RULU","4,10:LUUL","4,3:RRU","6,1:LDLU","0,1:RDLD","5,7:RUR","7,10:LLULUU","0,10:URDRU","7,8:LL","7,0:LLLL","1,0:L","7,9:L"]},{"w":8,"h":11,"a":["4,4:RULLLL","7,6:UULDLLLU","4,6:LDR","6,10:RUUULLU","1,5:U","4,2:LLLULDDD","1,8:RUUU","4,1:LLUR","7,0:DDDL","1,9:RRUR","1,6:DLDD","6,0:DLDR","4,9:DLLLL","5,10:U","0,0:R"]},{"w":8,"h":11,"a":["1,5:DRRUURD","4,8:DRUULURU","0,5:URRD","6,5:ULUU","0,8:RRUR","1,2:RDRURD","7,8:DDLUUU","7,6:L","7,4:ULURULL","2,9:RU","4,1:URRR","3,1:ULDL","0,10:RRR","1,3:LUU","0,7:R","0,9:R","1,0:L"]},{"w":8,"h":11,"a":["3,8:UUUU","3,2:LDD","4,4:UL","4,1:LULDLDDD","2,6:DDDDLLU","1,5:DLU","5,4:DLDD","0,4:UU","6,4:DDRU","1,7:L","7,2:ULDLDR","5,10:LLURRUL","6,8:UL","7,0:LLD","0,1:U","1,8:L","6,10:URUU"]},{"w":8,"h":11,"a":["2,6:URDDRU","4,3:DDRD","6,9:DLLLUUR","3,3:D","5,7:DRUU","0,9:DRRUUU","3,2:RRDD","2,4:LLUU","0,5:RD","6,5:UURUULUL","0,7:R","0,8:RD","7,7:UU","7,10:UU","0,1:RDDR","2,2:URRULL","1,0:L"]},{"w":8,"h":11,"a":["3,8:LUURRULU","1,7:UURUUR","3,2:RDDR","1,2:DLDR","5,8:LUL","0,9:UUUU","6,4:U","2,2:URR","5,5:RRUUUU","7,8:LULU","5,3:URULULL","3,9:RRRRDL","0,2:URU","0,10:RUU","2,10:U","7,6:L","7,0:L"]},{"w":9,"h":11,"a":["4,5:DDRRRRD","3,6:UURU","3,7:LU","2,5:ULD","5,6:U","1,6:DLU","6,6:UULU","0,8:RRRR","6,2:ULDL","2,3:LUURRUR","8,0:DDDDLDD","6,3:RUUU","5,8:RRDLLDL","2,9:LD","3,9:D","0,5:UUU","0,9:D","0,0:RR","8,10:LL"]},{"w":9,"h":11,"a":["4,5:UUUUULD","4,6:DDDLDRRU","5,6:UU","3,5:ULLD","6,6:DDLU","6,5:UULU","3,6:LDDL","5,1:RDRDRDD","7,5:DRDD","0,2:RRRD","1,6:DLDD","0,3:RR","7,7:DDRD","0,10:RUR","0,0:DRR","5,0:R","6,10:U","8,0:LDRD"]},{"w":9,"h":11,"a":["3,2:RD","4,4:LDRD","3,6:DR","2,5:DDDRRRUU","2,4:LDDDLU","6,6:RD","4,1:ULDL","5,5:RRURDD","5,4:RUU","5,3:UUUR","0,3:RRR","0,1:DRR","6,7:DDLLLDRR","8,0:LDD","7,3:R","7,8:DRD","0,0:RR","0,10:UURDDRU"]},{"w":9,"h":12,"a":["1,6:LUURDRRU","7,7:RULULLL","4,6:D","8,9:ULLLLLUU","3,3:ULURRUR","4,4:UURURUR","2,6:DLDRDDL","7,2:LDLD","0,1:DDRR","6,4:RURUUU","1,2:UUL","3,9:DRDL","5,9:D","0,8:U","8,10:LUL","0,11:UU","8,11:LLU"]},{"w":9,"h":12,"a":["5,5:RRRULLLL","4,5:LULLDRD","5,7:DLLL","5,6:LLDLLULUU","8,8:ULLU","8,6:L","5,3:LLLLLURRR","6,3:URRUULDL","8,11:LULDLULUR","8,9:LUL","4,2:RU","8,3:L","3,10:ULLULU","4,11:LL","5,0:LDL","3,0:LDLL","1,11:UR","0,11:U","0,0:R"]},{"w":9,"h":12,"a":["4,3:LLD","4,4:LDLD","1,8:RRUURRUU","5,2:DRDDDR","3,2:RUURDRD","6,8:URRUULU","0,1:DDDR","0,0:RDRDLD","3,9:RUUR","3,0:D","8,4:ULUU","0,8:UUUR","1,11:RRRRUUU","1,9:RDR","7,8:DLDR","6,0:R","8,2:UU","0,11:UU","8,11:UU"]},{"w":9,"h":12,"a":["3,7:RURUULUR","2,8:ULURRU","2,11:RULURRUL","7,8:LULD","2,5:LLDD","5,9:RRRU","1,3:DRRU","1,10:DLUURUL","7,7:UURUUUU","1,1:RDD","7,3:DLDD","4,11:UR","5,11:RUR","3,2:UULL","8,0:LLLLDRDL","0,0:DDDD","8,11:U"]},{"w":9,"h":12,"a":["1,9:LURRURRUR","5,9:LU","6,9:ULU","2,6:RULLLUU","4,3:DDR","4,10:LUU","5,4:RRRD","6,6:URDRDDLDR","3,4:LLURRUL","0,7:RU","8,11:LULL","5,3:RRRULLLLU","6,11:L","3,0:RRDR","0,11:URRU","0,2:RURR","8,0:DLU","0,0:R"]},{"w":9,"h":12,"a":["5,5:RURRDDLLL","4,5:LLDLDRR","4,4:RULLUUU","1,3:RDR","3,6:RD","8,9:LURULLLDL","1,5:ULDDDD","6,8:DLL","5,2:LUUR","3,8:DDR","6,2:DRURD","2,8:LDLD","7,1:LL","5,10:DL","2,9:DLDL","6,10:DR","2,0:DDLULDD","7,10:RD","8,0:D","0,0:R"]},{"w":9,"h":13,"a":["5,6:UUUULD","4,5:DDRR","5,8:RRUU","4,4:LDDLDLU","4,8:DRDL","2,5:UURULUULL","6,6:URRDDD","3,8:DDD","1,5:ULD","6,4:UR","2,8:LLDRDLDRD","7,9:LDRDLLLDL","5,1:RDRU","4,1:URRR","8,0:DDDD","1,3:UUL","8,12:LLL","2,10:U","3,0:D","2,12:U"]},{"w":9,"h":13,"a":["5,5:DRDDDLDD","4,5:LURR","6,5:UULL","4,6:LLUU","2,12:RRUUUUUR","2,3:RURR","1,10:DRUURULUR","7,6:DRUULURUU","4,1:RURRDLDRD","0,0:RRDDLDDDD","0,10:UUUR","8,10:LL","3,0:D","8,8:L","5,12:RRR","8,9:L","8,1:U","0,1:R","6,11:R","0,12:U"]},{"w":9,"h":13,"a":["2,12:UUURUURU","4,5:LDL","7,3:ULLDDRDLD","5,7:RURRDLD","4,8:RRDRRD","1,6:LURRUURRU","5,10:UL","8,3:DDL","1,9:UUR","0,7:DDDDRDL","0,3:DR","7,12:LLUL","4,10:LDD","4,1:ULDDLUULL","0,1:RDD","8,1:LLL","8,12:ULL","8,0:LLL"]},{"w":10,"h":13,"a":["7,9:LLLURUL","3,8:LLDLUU","2,7:LUUL","4,6:LD","6,7:DRUU","6,11:RULLLLUL","6,3:DRDLDL","4,4:UUUURRR","2,12:LLURRU","3,3:D","2,3:DDR","3,11:DR","4,5:RUUUURRRD","0,10:R","8,8:DDDD","5,11:D","1,4:LURU","9,9:UUUULDD","0,1:RURRDLDR","9,12:UU","6,2:RDR","8,4:RUUU","8,0:R"]},{"w":10,"h":13,"a":["5,6:UURD","8,6:LLDLLU","7,5:RRD","5,10:URULLLUU","1,6:ULURRDRRU","5,2:RUUL","3,1:LDDR","3,2:RDR","9,8:ULL","2,6:DDDL","4,9:LDRDDRR","6,3:RDRRULU","3,12:ULULLUUUU","5,1:LUL","0,0:DRDLDR","7,12:ULURUU","7,1:URR","8,8:DRDLDDR","8,1:R","0,11:RDR"]},{"w":10,"h":13,"a":["5,5:RULLLL","1,5:RDDRUURDR","9,4:DDLLDLU","4,7:DDDLLLLU","5,7:DD","2,2:LLDDRURRR","0,0:DRRRDRRDR","7,5:RULURR","2,8:R","9,10:UULLLDDL","9,0:LLDRRDLLL","0,8:RUU","9,7:L","5,11:LLDR","5,1:RU","9,12:ULUL","4,0:D","6,12:URDR","2,12:UL","0,12:R"]},{"w":10,"h":13,"a":["3,10:UUURRRUL","4,3:DRRDLLDL","2,7:DLLURURU","3,4:LURU","1,12:RRURRULUU","9,8:UULDDLUU","9,9:LLLULD","1,2:DDD","1,9:LDDD","0,5:D","6,3:RULLLULL","7,5:URDRUU","5,12:L","4,0:LLLDLU","7,11:DRUULLD","7,0:DL","8,3:URUU","5,0:D","8,0:D","9,12:UU"]},{"w":10,"h":13,"a":["9,7:LLDLUUL","6,10:RULLUULU","4,4:DLUU","4,2:DRDRDL","7,4:RRUUUUL","4,8:LLURUL","0,11:UUURULURU","8,6:LU","2,5:ULU","9,5:L","3,2:ULUL","1,11:UURDRUR","7,3:LULULU","8,3:ULU","0,5:UUURULU","5,10:DR","0,12:RRURDRUU","9,12:ULLDLL","6,0:D","9,10:LURUL"]},{"w":10,"h":13,"a":["1,3:RURRRDLDD","4,6:LDRRUUURD","2,6:UR","3,3:DLLD","1,9:RRUR","0,9:UUUU","6,6:DDLDDLDL","7,6:RDLDRDLLD","8,5:LURU","9,4:UULLLD","0,2:RURRURD","8,0:DLLL","3,10:LLLDRRDRR","9,10:UUU","0,0:R","7,10:RDRD","6,11:RD","5,11:D","0,12:R","9,1:U"]},{"w":10,"h":14,"a":["5,8:RDDRDRRU","6,7:RURD","2,5:LLDRRRD","4,8:DLULUL","5,7:URU","4,6:D","7,8:DRURUUUUU","5,9:DLLL","5,11:LLLLULD","5,5:LLURRRUUL","0,8:R","0,9:RR","1,12:RRRRDRUU","5,3:LUURUR","7,5:URUURU","0,13:RRRR","2,4:LLUU","7,13:URRD","3,3:UUULDLL","6,1:RRUR","0,0:R"]},{"w":10,"h":14,"a":["3,6:UURULLDD","5,7:DLLURUU","6,7:UL","2,6:DDLDLUU","6,5:LUUU","4,9:LLDDLLU","9,5:ULLL","1,7:UUUL","4,0:RDL","8,9:UUUULD","3,1:LDLDLU","9,3:LLUUULDDD","3,10:R","4,11:LDRR","5,10:URDRRDDD","9,12:UUUUUU","1,1:L","3,0:LLL","9,0:LDRDL","5,11:RRDLDLLL","2,13:ULDLU"]},{"w":10,"h":14,"a":["5,7:LLURRRD","5,8:LDRRDDRD","7,7:DL","4,10:RDLDRRDLL","3,8:DLLDLU","5,5:LLLUUULDL","0,4:RDLDRDDRU","8,8:UUL","7,5:LU","0,12:URDRRULUR","7,2:DLULDD","4,3:DL","9,7:UULUL","8,13:UURULLU","3,3:URURRRU","9,9:L","3,13:LLL","0,1:RRR","3,0:RRR","8,3:UU","9,4:UU","9,1:U","9,13:U","0,0:RR"]},{"w":10,"h":14,"a":["6,8:DLUL","5,7:RR","5,5:RULU","4,9:LUUUUUUULD","4,5:DD","7,9:RRU","9,0:DDDDLDDLLL","2,7:DLLUURU","5,10:DLULDLUULD","9,7:LDL","2,1:RRRDLDD","7,13:LUUU","4,12:LDLL","7,4:ULURRUULL","2,6:UULULURU","9,13:ULLURRULL","5,13:U","0,13:URULUU","5,0:LLLL","0,1:U"]},{"w":10,"h":14,"a":["9,8:LLLLULD","3,7:DDRDLLLUL","4,6:UUL","5,9:DDLDRD","9,6:DLLLUULD","1,7:URRULU","0,4:RDLDDDRR","8,12:LDLUUUU","2,0:RRRRDLDDD","7,9:RRDLLDR","7,6:UULURRURUU","0,13:UURRDRU","9,4:LDD","0,2:DRRR","2,1:RR","4,3:ULLLUU","1,13:U","7,1:DL","9,11:D","9,13:L","8,1:U","0,0:D"]},{"w":10,"h":14,"a":["5,7:DLUU","3,6:URURULLDLD","2,6:DLLDDRURD","9,9:ULLLDLLLU","6,4:DLD","4,2:LLDLLDRDD","6,6:DRU","4,13:RRULLLULUR","4,10:R","4,11:RRURURDR","9,2:DDLL","8,5:L","4,0:RDDRRRDLL","9,6:LD","0,0:DDRUURRDR","2,13:ULDLUUUR","6,1:URDRUR","9,13:ULDLUU","9,11:L"]},{"w":10,"h":14,"a":["3,3:RURDRDLD","7,3:DDLDDL","4,5:DDLL","3,5:DLLDLDRRR","2,4:RR","4,9:UR","7,6:DRRD","9,4:DDLU","6,8:RRDRDLD","1,4:DR","6,9:LDL","1,0:RRDRURD","0,5:UURRUULL","6,10:DLLLULD","3,9:LLDD","8,4:URU","9,1:LDLL","9,0:LLD","7,10:DDLL","6,0:D","1,2:L","0,13:RRULLUUU","3,12:DRRRRR","8,12:R"]},{"w":10,"h":14,"a":["4,6:ULD","4,8:RRRUULDLLL","4,4:LLLDRDD","3,8:LDRRRRRDLD","5,2:RDLDRRDLL","0,1:DDDDDDRU","9,8:DLUU","8,4:DRDL","2,2:DR","0,9:RDRRRR","2,12:RURR","0,8:R","4,3:ULULLUL","8,0:DLDD","5,12:LDLLLUUR","8,10:RDLLDLD","5,0:D","4,0:D","8,3:URUU","6,0:D","0,12:UU","9,13:ULDL"]},{"w":10,"h":14,"a":["6,3:RDDLULDD","4,5:ULU","4,6:LULUUL","6,6:DLLLLLL","4,8:RRDRUUUR","4,1:RDD","9,5:DD","3,8:DDRR","4,3:ULUL","9,4:LD","1,5:ULUURUURR","8,7:DDRD","1,6:R","6,2:UURR","9,0:DLLD","9,2:LD","4,11:RR","6,10:RRDR","5,12:LDRRURRDR","2,8:DDD","0,11:UUR","0,8:R","1,13:RRUU","0,1:U","0,13:URUU"]},{"w":10,"h":14,"a":["3,4:UURDDD","4,6:LDLULDLDR","5,6:DLD","5,5:RDDD","4,1:LULDDDDDR","5,4:RRDDDDR","5,3:URDRUUR","5,8:DLDRDLL","0,4:DR","8,5:RDDD","7,0:LDL","3,8:LDRDLDLD","9,1:DLDRDL","1,0:DDLDRD","0,9:DDDDRRURR","9,9:LLL","6,10:RRRDLLLD","5,12:DRR","0,0:D","9,0:L","7,12:RRD"]},{"w":10,"h":14,"a":["5,6:RRRDDDDR","5,5:LD","5,7:LLU","3,4:RRRD","3,5:LLDDDLU","5,8:DLL","2,3:RRR","6,7:D","6,12:UUURUU","8,5:LU","5,10:LLLULDDRD","0,3:RDR","3,2:RRUURDDD","8,2:LDRDRDD","5,11:LLDRRDLLL","7,10:DRRD","4,0:DLLULL","0,2:RR","9,0:LLDRRDD","0,13:RULUUU","7,12:RDR","0,1:R"]},{"w":10,"h":14,"a":["4,6:RDLDLLURU","0,4:UURDRDDR","4,5:ULUR","2,6:LLD","0,5:R","2,2:RRURDDDRD","6,7:URUURURD","8,5:RDLDRD","1,7:DLDRRDDDR","2,13:RRUULUU","4,10:URURDRRDR","5,0:LLLLDRR","6,0:DDDR","0,13:UUUR","9,0:DDLL","5,10:DRURDDLD","1,13:UU","0,0:D","7,0:DRU","5,13:U","8,11:RD","8,12:DR"]},{"w":10,"h":15,"a":["3,6:UURDDDR","6,7:DLDLDDL","6,6:URDD","5,6:UURRUUUURD","4,8:LULU","8,7:DLD","9,6:DDDDLDLULL","8,5:R","5,2:RDLLLLDLU","0,8:DDRDRURULU","4,2:LLULDL","0,7:RU","5,11:RDRD","6,1:LLLULLL","0,5:R","8,4:R","5,12:DRDR","3,14:URU","0,13:URRR","8,14:UURU","8,3:URUU","0,14:RUR","9,14:U"]},{"w":10,"h":15,"a":["4,9:RU","9,7:ULDLDLUL","4,8:LLURRURUL","5,3:LDRRDRDL","5,10:RURDDRU","8,14:RULULLUL","3,6:ULURULLDD","9,8:L","8,9:R","3,9:LLDDDLDRD","7,4:ULUL","1,7:DLUUUUUUUR","8,3:DRDL","4,14:UUR","2,11:URR","5,14:UR","4,11:LDLD","3,2:RURR","9,1:LDLUULL","7,14:U","3,14:U","2,2:URUL","9,0:L","1,0:L"]},{"w":10,"h":15,"a":["4,7:DLUULDDLLU","5,13:UUUU","5,7:DRDDRUUULU","4,9:DDD","4,6:RURRDRUURU","5,14:LLLURUUUU","8,2:DLLDLLD","0,10:URR","3,5:LURURRURUR","9,14:UUUULURULU","1,7:UUUL","0,12:RRULUR","6,14:UUU","2,3:ULDLUUUR","8,14:UUUL","3,2:RURURRR","7,14:UU","2,0:DRUR","0,13:R","9,2:UU","0,14:R"]},{"w":10,"h":15,"a":["6,7:LDLULURR","6,6:URDD","3,3:DRURRDLDL","3,5:LUUURUU","5,9:DDRUURD","3,8:LUULULDDRD","1,9:RRR","7,8:RUU","9,2:LLLL","9,8:UU","7,4:URR","8,5:UR","5,1:LURRDRRR","5,12:DRURURUUR","1,4:U","1,10:RR","1,1:DLDD","4,10:DDDDRRRUR","9,10:DDDD","0,12:URRR","9,0:LL","0,13:RURR","2,1:UL","0,14:RRURD","0,0:D"]},{"w":10,"h":15,"a":["9,7:UULLLDLU","4,7:ULURULLD","7,11:RRULLLUUUL","3,11:UURU","7,0:RDLDLDRDLL","1,3:ULUURRRDDD","3,7:DLDLDD","4,11:URUU","9,9:LLUURUL","4,0:DRDLDR","1,7:RUL","0,6:DDDDDDRD","0,4:RD","9,3:DL","6,13:LLLURRRUL","2,10:DDDDRRRR","6,0:D","9,8:L","9,1:DL","7,12:DRURDD","0,14:R"]},{"w":10,"h":15,"a":["5,6:UULD","6,6:DL","4,7:DR","8,5:RDLLULUULU","3,4:D","4,6:LDDDRRD","2,5:UUR","7,7:RRDDDDDLDR","2,6:DDLDRDLDLU","7,8:LDD","7,3:DRRULULLU","7,0:LLDLDD","0,1:DRURRD","0,6:RULURU","7,10:U","1,7:L","4,10:DDDRUURRD","3,10:DDDLDRRRR","9,0:LDL","6,12:DRDRR","0,0:RRR","1,13:URU","0,14:UU"]},{"w":11,"h":15,"a":["9,7:RDLDLULDLU","5,7:DDLDLUU","6,7:UL","7,7:UULLLL","4,8:UULDLUULLU","10,5:DLLD","6,12:RUUL","8,5:RURULURUU","1,3:DRRRRRU","7,4:RUUUULLLL","5,10:DDL","2,8:LUUL","0,2:RRDRRR","4,11:LDDRRRRDLL","2,13:UUUU","10,9:DDLULD","1,13:ULURUULUU","7,3:UULDLLLUU","8,14:URUL","10,13:U","4,14:LLL","2,1:LLU","9,0:D","10,14:L","0,14:U"]},{"w":11,"h":15,"a":["5,7:DDDLULURUU","7,7:UUULLDRDL","4,5:UURRRRDR","3,6:LDLULDDRRD","6,7:DRRUUURRU","2,3:RDLLLDRRR","5,2:UURRRDRR","6,9:DR","1,3:LURRRRU","9,11:ULDLLLLLU","10,7:UL","2,10:DDDDRRRRURD","1,0:RDR","7,9:RRR","10,8:LU","10,2:LLL","1,11:ULUR","10,12:LLLL","9,3:R","1,14:UU","0,0:DR","10,0:L","10,14:LLU","0,14:UUU","10,13:L"]},{"w":11,"h":15,"a":["8,5:DLULDLD","4,10:ULUUURDDR","6,7:DDLD","1,9:RULLUURDRU","0,5:RUURDDRRR","10,5:LDDDLULD","1,1:URRDLDRDDRR","4,11:RDDRRDR","6,2:LLDRRDR","10,6:D","4,13:ULULLLURRR","10,13:UULLLDLUUR","7,9:RDRR","8,2:DLUUULDLULD","9,4:URULURU","0,4:U","1,12:RDR","10,9:L","4,14:R","10,14:LULUR","0,14:RU","0,2:R","8,0:D","0,1:U"]},{"w":11,"h":15,"a":["4,5:UUURURD","8,5:LLLD","6,6:DLDLUUL","1,6:UUURDRDLD","6,11:LLLURULUU","7,9:LURU","5,4:RRUR","7,6:RDDD","2,7:DLULUUUUU","5,9:DRRRRUUR","3,2:LLULUR","4,1:URR","10,6:DLUURULUR","1,10:URD","9,13:LLULDDLUUL","3,1:LU","1,14:RUUULLUUU","7,2:UURDDRRULU","7,11:R","3,14:UU","4,14:U","1,12:LDD","10,11:LDL","7,14:RR","10,14:UU"]},{"w":11,"h":15,"a":["0,4:RRRDDRD","1,5:DDRRDDRURU","5,5:LURU","5,6:RUU","8,6:ULDD","4,3:URR","6,11:LLURURU","1,9:DLUURRD","7,4:RRRDLDRDDD","8,13:URRUULUUUL","3,3:LURURURR","7,10:URUL","3,11:ULDDRRDL","6,3:RRRU","0,14:RURDRRRUU","5,1:RRDRURU","3,0:L","8,10:DLD","10,14:ULDLLLUU","0,0:DDDR","0,12:R","10,3:UUU","1,0:DD","0,11:R"]},{"w":11,"h":15,"a":["7,7:LURRDDLLL","4,8:DRR","4,7:RULULDDD","0,8:DRRR","2,8:LULU","2,7:ULURULUL","3,3:DRRRRRDLLL","3,11:RRUL","3,12:RRRRULUR","8,9:DRUUUURDD","3,10:LLLDDDRDL","3,13:LULUR","7,13:LLL","2,0:RRDD","5,3:L","8,2:DLLUUULDD","2,3:ULLU","8,11:RRDLLDRR","4,14:LL","0,0:RDRRD","10,14:LLLL","10,3:DDLU","9,0:LDLD","9,3:UURU"]},{"w":11,"h":15,"a":["5,8:ULDLULULLD","4,9:DDLULDLULDD","2,5:LURURRDLDDR","6,8:URRU","2,9:R","5,9:DDDLLDRR","4,5:RDRRURR","7,8:RD","2,8:LDL","7,9:LDRRRRULURU","7,2:RDDLULLD","7,11:RRRDDD","0,13:RUR","6,12:RRDRDL","9,7:URUULURULUR","8,1:ULDLDLL","4,14:LLLL","3,2:LURULLDDL","6,14:URD","5,0:DL","0,3:R","0,0:D","10,0:L"]},{"w":11,"h":15,"a":["6,8:DLU","5,7:RRULLLD","0,8:DDRURRURD","1,3:LDDDDRDR","5,10:LLLDRDLDRD","10,14:ULURUULLLUU","5,11:LD","7,5:LLLLDLDR","6,14:UUUU","4,4:RRRRDRURUU","5,12:DLD","9,7:LURR","9,8:LD","10,9:L","8,0:LDLDLULDDLD","1,6:URUUUL","8,13:UULD","6,0:L","0,12:UR","0,0:RDRURDD","7,13:D","7,3:URDRUU","1,12:DL","0,14:RR","10,0:L"]},{"w":11,"h":15,"a":["4,12:LURUULULURR","3,6:RURD","5,7:RUURDRDLDD","4,8:RRDLDRR","2,5:RUR","1,6:UURULULD","0,9:URDRDR","0,7:R","6,4:LUL","10,4:LDDD","3,3:ULUR","5,2:LUULLLD","6,1:DDRD","9,10:DDLULDLULD","9,14:URUUUULULD","5,1:URRDDR","2,11:DLLDRD","5,13:DRRURD","10,0:DDLDLDD","3,14:U","0,11:RUL","4,14:U","2,14:U","8,1:RU","0,0:D"]},{"w":11,"h":15,"a":["4,7:UURRUURUU","5,8:LDLU","6,7:ULD","3,7:UULD","2,7:LDLDRRDRR","7,9:LURU","5,4:LL","4,11:RRURRDR","0,7:UUUU","0,1:DRDDRURR","5,3:ULLUURRRR","10,10:UUUULD","10,11:DLLLDLULL","8,7:DRDD","10,2:DDLULDLDDR","3,12:ULDDRDRURD","9,5:L","0,0:RDRD","1,10:DD","0,10:DDDRDL","6,14:R","8,2:RULU","10,14:ULL","10,0:D"]},{"w":11,"h":15,"a":["4,9:DRRULUR","4,8:LLDDLLDR","4,3:RDDRRDLL","4,11:R","5,7:LUL","4,5:LLDL","0,7:DDRU","6,7:RDDRUUURD","3,9:DDLDLLDRR","4,12:RD","7,10:DLDRRDR","3,12:DRDR","8,10:DRDRUU","1,2:DLDDRURRR","6,4:RRRR","9,8:DR","3,3:LURR","6,3:UURRDLDRRR","6,13:DRRR","2,14:R","0,1:RRRRRD","10,5:LL","9,2:RUULLLLLL","0,14:R","10,14:U","1,0:L"]},{"w":11,"h":15,"a":["5,6:RDRRULULLL","4,7:ULUURRRUL","5,7:DLDDLUULDD","4,3:ULURRRUR","1,6:UUL","0,5:DDRRU","2,5:U","7,4:UUURURD","5,9:RDLDLLLDLL","0,8:R","7,8:DRURDDD","3,3:LLLU","4,12:LDLLLDR","8,5:URRUUUU","9,6:DRDDDDDLD","1,1:RURR","0,10:DRUUL","6,11:DLDLDRR","9,5:R","7,12:UU","0,0:R","8,14:UUUU","7,14:U","10,14:U"]},{"w":11,"h":15,"a":["5,8:RRDLLDRRDL","4,8:DDLDDRDL","8,8:URULLDLLLL","3,9:ULUURURRRR","8,9:DDRDLDDRRU","4,11:RD","0,11:DRURUU","2,14:RRRRRUULDL","9,8:RUUUUUL","0,7:DRD","0,5:RRURRRU","10,10:LU","1,10:L","6,3:ULUU","7,3:DL","9,5:ULUU","0,6:RD","4,3:LLLDLUUU","7,2:URRDRU","0,0:RDDRRR","1,14:URU","2,0:DRR","6,1:URRRR","0,14:U"]},{"w":11,"h":15,"a":["5,9:DLUU","5,8:ULU","6,6:LULLDDD","7,7:DL","3,9:LULU","6,9:DDLDLULDD","8,5:UULDDLULL","10,7:DDDLULDDLUU","3,10:LDDDDRR","9,7:DL","2,6:UULLDRDLD","1,10:LD","1,9:L","4,13:RDR","2,2:LDRR","4,2:DRRUURDR","10,6:LLL","6,12:DRD","5,0:LDLD","0,12:R","9,1:URDDLDRDLDR","7,12:RRDD","1,13:DL","9,11:RDDD","0,0:RRDLLDD","8,13:D","8,0:D"]},{"w":11,"h":15,"a":["3,8:DRU","5,8:ULUR","6,7:DDL","3,7:UURURDR","10,5:DDDDLLDLUU","5,11:LU","8,8:RUUUURUL","7,7:RUU","6,4:UULDLLDLDD","1,3:LDRDLDRDRD","3,10:DLD","1,8:DRDLDL","4,12:LDRDLLULL","9,11:LDLULUL","6,6:RUURULURUL","7,13:LLUR","5,14:RRRURURDD","5,1:URRRRR","1,1:RRURDDL","0,12:R","10,10:L","0,1:DRRD","0,0:RR","10,1:LD","0,14:R"]},{"w":11,"h":15,"a":["7,7:DLLU","6,7:UUURDDRDDD","5,9:DLULDLU","6,9:RDRD","3,6:DLDRRU","4,6:RULLLDLL","10,12:LLLULL","7,3:LUULDDLDR","9,10:DRUULU","1,8:ULDDRDLD","9,14:RULLLLULD","10,0:DDDDLLD","10,8:ULUR","4,11:LLLDDRDLL","3,4:UURULLDLL","3,14:UU","4,14:UU","10,5:L","8,0:RDLLDRRDL","2,4:UL","2,0:RRR","0,5:RU","0,0:DR"]},{"w":11,"h":15,"a":["5,7:DDLU","5,6:URDDDRUUU","4,5:LURRRRRDR","4,6:DLULUULDD","2,7:DRDLDLLUUU","4,3:RRR","10,3:LDRDDLLD","6,9:RDR","0,3:RRR","3,0:LDLLDRRRRR","5,10:RD","5,0:DRDRRD","4,11:DDRRRR","1,14:LUURURRUR","5,12:RRRRDDR","8,8:DRRULUR","4,0:DL","7,1:URDRDRUU","9,10:R","8,11:L","2,14:UU","3,14:UU","10,11:L","0,0:R"]},{"w":11,"h":15,"a":["3,5:DDDDRUUURD","6,12:LUUUURU","6,5:DRURULL","7,7:DRDR","2,7:UULURRRDRU","7,12:ULURUL","8,6:DRDRDDLLD","6,3:RULL","1,7:ULUUURULUU","0,10:RULURR","5,3:LLLURRURR","0,11:RRUR","9,5:DRD","3,14:LURRULURU","10,2:LLD","10,3:LDRD","10,12:DLLLDLULD","6,0:RDRR","10,11:L","1,0:DRURR","2,12:LDDL","8,0:R","10,14:LL","10,1:U"]},{"w":11,"h":16,"a":["1,7:DRRURDRURU","6,9:LLLLLLUUUR","4,5:LDRR","6,8:RRDRUURDDDL","5,10:DLDRRDLDLUL","9,4:RDDLLLDR","0,3:DRRRRRD","7,9:D","6,10:DRD","2,7:UUL","5,2:LLDRRRDDR","4,10:L","8,10:DRRDLLDLDLD","8,2:DLD","2,10:DRDLDD","7,2:LURURDRDDRU","1,10:LDRDLDRDD","0,1:RURRRDRUR","7,15:RUR","0,2:RD","3,15:U","10,14:UL","10,1:U","10,15:L","0,15:U"]},{"w":11,"h":16,"a":["4,8:DRDLDRDLDL","7,11:ULURUULDLUL","3,7:LUUURDDR","5,6:ULUULLLDDD","3,8:LLULUUUUUR","6,6:URRRDRUULU","3,9:LLD","7,6:RD","3,10:LDRDLDDRDLL","8,8:DDRUURD","5,3:U","10,7:L","6,11:DRRDLD","6,4:UUU","10,14:LLDLLLLURRUL","7,4:RUUUUR","0,15:URUUULUUU","8,11:R","7,3:UUULLDL","3,2:U","10,12:L","2,2:UL","4,0:L","10,3:ULURU","10,13:L","2,0:L","0,1:U","10,15:L"]},{"w":11,"h":16,"a":["3,5:UURRDLDRDLDR","5,10:ULLURR","3,7:ULUULDDLDRD","7,11:RDLLLURUUURU","6,6:RULU","8,7:UUUUULDLU","10,2:DDDDLDDLDDLU","2,7:DDDLLDRDRURD","2,15:RURDRURULLUU","0,9:R","10,8:U","9,9:RDLD","5,2:URRRUL","3,1:DLLLDRR","4,2:UUL","10,0:DLDDDD","3,13:L","7,13:RRUR","0,13:RDR","1,1:LU","10,15:LULDLU","2,1:U","0,15:U"]},{"w":11,"h":16,"a":["1,8:DLDRRRULURR","0,3:DDRRRRDLDRRD","5,10:DLUURRURD","6,10:DDLDRDRUR","7,7:RDR","6,3:LDRDLD","9,9:LDRRUUULURU","9,0:RDDDDLDLDLLD","2,12:URDDRU","7,11:RRDDDRD","1,6:RDL","4,4:UURRULUL","8,3:DLD","1,2:RRDLLDRR","5,14:L","1,11:LDDD","0,15:RUURDRDRR","7,0:DRRDLLD","4,1:LLLU","8,15:U","0,0:D"]},{"w":11,"h":16,"a":["6,7:RRRULL","5,8:UURULURRU","4,6:UUULDD","3,7:ULULDLDRRD","4,10:RURU","4,9:ULDDDDLDR","10,10:ULULDLU","2,9:DLULDDD","7,15:LURRULLULLUR","0,8:R","8,4:D","7,10:LDRDRUURDDRD","7,0:RDDLULDDL","1,0:DRURRDLDR","5,0:D","10,6:DD","10,3:DDLU","3,15:ULLLURUUR","0,4:RR","0,0:DDRRDL","4,14:UR","10,0:LDRDLDL","5,14:D","0,15:RR","9,13:DRD"]},{"w":11,"h":16,"a":["5,6:LD","4,8:DLUULULDDRD","4,12:URRRULURULU","5,7:DDDLLDDLDLL","3,6:URURDR","6,6:RU","8,7:UURRULLLLU","5,3:URR","0,2:DDRURDD","4,3:UURR","3,3:D","8,8:DDDRDLDRDL","2,10:DL","0,5:R","5,12:RRDLLLLDLD","6,0:LLLDLDR","9,7:URD","7,3:RURU","0,10:RU","4,14:D","9,8:DDRD","10,15:LLLULDLU","0,12:R","0,0:DR","9,3:RUUULLDLU","1,15:ULD"]},{"w":11,"h":16,"a":["9,11:ULLURULULD","5,8:DRD","5,7:LDDDRDRRDR","5,3:DRDRDL","3,7:U","1,6:DRDDDRUU","7,13:RRURUUULU","8,7:RULU","10,8:UUULULLULU","6,12:LDDRRDLLLLL","5,6:ULLURULLULUU","1,15:ULURURURDRU","0,5:DDDR","6,1:LDLLURUR","7,2:URRU","0,10:RU","8,3:URDRUUU","0,4:RDRD","8,15:U","10,14:L","0,11:R","10,15:L","0,2:DR","2,0:D","0,0:D"]},{"w":11,"h":16,"a":["4,7:DDDDLULDDR","2,7:UUUURDRDLDR","6,14:UUUULU","5,8:UURDDDRDDDR","0,8:URDRDRUU","10,5:DLDLULD","7,8:RDRRDLDRD","9,2:DRDLDLULDLL","5,12:DDDRRUURDD","6,3:DLUL","10,8:L","0,12:RUU","0,2:DDRDLDR","4,12:DLLDRRDLL","1,9:L","6,0:LDDRURDRDL","1,0:RDRURDD","0,0:DRDR","1,15:LURUL","9,12:DD","10,0:DLL","10,13:D","10,15:L"]},{"w":11,"h":16,"a":["7,6:ULDL","5,7:DLDDDRRRURD","5,5:LDLULDLULDD","0,10:RDRRUUUUR","6,7:RRDLLDRRRU","6,4:RRRURD","4,3:RDLL","6,3:RRURRULLLU","8,6:URRD","3,3:LDLU","9,6:DRDD","0,8:RURD","1,0:DDRRURDR","6,1:D","0,9:RR","5,0:D","9,10:RDLDLLL","10,12:DDLULLLLUL","5,14:RDRURDRR","2,0:D","0,3:D","2,12:RDLDDLUUUL","4,14:U","8,0:RR","3,15:U","0,0:DD","0,13:DD"]},{"w":11,"h":16,"a":["0,9:RURULURRDRRD","4,8:LDRDRURUURDR","5,6:URDRURRD","4,6:U","8,7:RDRU","7,9:RRDLLLDL","4,11:DR","3,10:DDDRRDLD","5,4:LU","3,5:UULDLUURRRUL","0,7:D","5,2:UULLLDLU","10,0:LDRDDLDLLL","2,9:DLLD","8,2:DLLL","1,5:R","7,11:DLDRRUUR","9,14:UURUUU","8,0:DLDL","6,1:U","0,6:UUUUUU","5,15:R","0,12:RURD","6,14:RDR","0,15:RRR","0,13:RDRR","10,15:U"]},{"w":11,"h":16,"a":["5,7:RDLLULDLUUU","5,6:LLUUUULUR","6,6:ULLUUUUURDR","6,4:UURD","7,6:UURURURULUR","9,12:UULURULLUR","7,12:RULUULL","6,10:DDDRDLDLUL","1,6:UURULUUURR","9,7:RDDDDDDLLDR","9,5:LD","3,12:URRU","4,9:DLUL","10,6:L","1,9:ULUR","1,13:RDDRUURRUL","0,5:D","1,15:ULUUURDRUU","10,4:L","0,2:DD","6,0:RDRU","0,10:R","9,15:LL","0,0:D","10,14:D"]},{"w":11,"h":16,"a":["2,10:LUURDRUU","5,10:LURRRULLLUR","8,7:ULDLULLU","4,4:LDDLUL","2,7:LULUURRURR","9,7:UUULDLLL","6,12:ULDDLLURULU","5,4:RRUR","4,2:LURRDDRURR","0,7:D","9,11:DRUULULUR","2,11:DDLULDDRRR","10,0:DDLDRDDDD","8,15:ULLURRULURUL","2,0:DD","0,11:R","6,0:D","0,15:RRRRUR","1,1:DLDR","7,0:DR","0,0:D","9,0:D","9,14:URDD"]},{"w":11,"h":16,"a":["5,8:LUULDDLUUL","8,8:DLLL","6,8:RULU","10,9:LUULULULLDD","4,9:LLLDRDDRUUR","5,10:D","7,12:URULLD","6,12:LD","1,8:LDD","5,0:RDRDLLDRDL","4,11:DDDRRDL","1,4:DRRR","8,1:DRDLLD","10,7:D","4,4:LLURRULLLL","10,10:LDDLDDDLUUL","9,0:DRDDDLLDR","10,6:L","0,7:R","10,11:D","1,11:DDL","4,15:LLULDL","2,1:LURRDRU","10,15:LU","10,13:L","0,3:R","0,0:D"]},{"w":11,"h":16,"a":["10,2:DDLLLDRDLDL","6,8:DDLUULURUL","7,8:RURUURDD","6,6:U","6,4:LDLULDDD","7,9:DDLDRRRUURD","9,9:L","3,8:LUUU","6,0:RDDD","4,9:LLLULURUUL","5,11:LULDDRDLD","6,13:LU","9,8:R","6,3:UULULLL","10,14:LLUL","4,2:ULL","8,2:DRUU","6,14:RDRRR","5,3:LLUL","1,10:RDLDRDL","0,9:DDDD","1,14:RDRRURDR","2,4:ULDLUURUU","10,13:L","8,1:UR","10,0:D","0,15:R","0,0:D"]},{"w":11,"h":16,"a":["5,8:ULDLDR","5,9:DRDLLULDDRR","6,8:DRDDDLDRRUU","10,8:LLLULULL","1,5:DDLDRD","2,9:UURULURRRR","9,13:URULULUR","2,10:DDL","4,13:LLDRDLL","1,10:DLD","4,4:LLLLDD","4,14:DRRURR","9,7:LULUULL","9,2:URDDLLLLLL","10,6:L","6,0:RRDDLLLL","4,1:ULDLDRDL","10,5:LLU","1,14:ULDD","5,0:DRR","9,15:U","10,4:L","10,14:U","1,0:DDD","0,0:DDD","10,0:L"]},{"w":11,"h":16,"a":["6,7:URDDRRDLDRDR","6,8:DLUU","5,1:DLDRDDDLD","8,7:RRULLURRUUU","3,8:RDD","5,0:LDLDDLDDRURD","7,9:DLLDLD","6,4:DRURRUUURUL","1,8:UURD","0,7:DDRR","5,12:RURDRDLLLL","0,10:RDRRUU","6,3:UUURDRU","2,0:DDLLDRDD","1,14:DRRRULLURUL","6,15:LUR","9,15:UUU","0,11:DRDLDD","7,15:U","8,15:U","0,0:RD","10,15:UUU"]},{"w":11,"h":16,"a":["5,8:UUUURD","4,9:DDRRULURURD","2,13:LUUURDRUUU","6,7:RRDDDLDRRU","4,8:ULLDDLU","4,6:LLUL","4,5:LULL","7,13:ULLL","1,1:ULDDDDDDRDLD","7,6:UURURUR","8,0:LDDDLL","4,4:ULLLURU","8,6:URUR","3,12:DRDRURDRRD","10,13:UUUULU","9,7:R","0,9:D","6,1:DL","0,11:DDD","9,6:R","4,1:DLUUL","7,15:LLL","10,15:ULUU","0,15:RURR","5,0:D","8,2:URUR"]},{"w":11,"h":16,"a":["6,6:ULDDDDLU","4,6:ULDLUURRURDR","6,8:URUUUULUR","4,7:LDDD","6,9:DRDLLULDDL","8,6:URDDRUUU","1,8:DRUU","1,7:UUUUUULDDDD","8,8:U","7,9:RDDRURD","8,4:RURUUUL","3,3:LUURRULL","5,0:DDLL","0,6:D","10,9:LU","8,3:URULLLU","3,11:LDLULDDR","0,10:RR","0,14:RDRRULURR","5,12:RRRDRDR","10,15:LLULULLD","6,15:U","4,15:U","1,0:L","10,12:L"]},{"w":11,"h":16,"a":["5,7:DLUULDDDLLL","5,6:RD","1,3:LDDRRDLLDRR","4,3:RDLLDR","5,9:RURUUU","5,5:RURU","5,12:LURRULLU","2,8:L","9,3:LDDD","9,12:URULLDLUU","3,10:DDLDLLDR","5,2:LLD","3,1:LULDDRDD","8,7:DDR","10,5:DLD","0,12:RULURRD","4,1:RURR","10,8:L","8,14:LLLLUR","6,2:URDRRRULLUR","10,4:LD","6,13:RURDRDDLL","6,15:LL","3,14:DLLL","0,1:D","10,15:UUU"]},{"w":11,"h":16,"a":["3,11:DDRURRULLU","4,7:LU","3,8:RRRRDLDLUL","3,9:DLU","5,7:ULURULLDL","0,10:RULUURDRU","6,7:UUUULLLL","6,15:RUUUUURUUUL","2,6:LLURULUURR","9,8:DRU","2,11:LLD","7,6:UUUULLLLU","10,13:ULDLUURRUL","0,15:RULURUR","5,15:URUL","8,6:UURRULLUR","3,15:U","9,7:UUR","4,1:ULL","4,15:U","2,15:U","9,0:LDLULD","5,0:D","10,14:LDLU","2,1:LLU","10,0:DL"]}];
  /* Kurallar: her ok, ucunun baktığı yöne doğru (gövdesi arkasından gelerek) kayar.
     Ucun önündeki hücrelerden biri başka bir okla doluysa çarpar: 1 kalp gider. 3 kalp; biterse bölüm baştan.
     Bütün bölümler önceden üretildi ve çözülebilir olduğu doğrulandı (oklar.py / açgözlü çözücü).
     Kayıt: ok_lvl (bölüm), ok_max (açılan en yüksek), ok_stars, ok_best (süre), ok_hint, ok_intro, ok_state (yarım bölüm), ok_gun (bugün kaç yeni bölüm).
     Açılış: pazartesi 08:00'e kadar ilk 20 bölüm açık; sonra kalan 80 bölüm, günde 10 yeni bölüm hakkıyla (eskiler hep tekrar oynanır). */
  var $ = function (id) { return document.getElementById(id); };
  if (window.OK_BOLUM2) LEVELS = LEVELS.concat(window.OK_BOLUM2);   /* 101–200: şekilli zor bölümler (ok-bolum2.js) */
  var NS = "http://www.w3.org/2000/svg", S = 100, N = LEVELS.length;
  var DIR = { R: [1, 0], L: [-1, 0], D: [0, 1], U: [0, -1] };
  var board = $("board"), wrap = $("wrap"), stage = $("stage");
  var lvl = 0, maxLvl = 0, stars = [], best = [], hints = 3, L = null, A = [], occ = {}, hearts = 3, mistakes = 0, left = 0;
  var tStart = 0, tBefore = 0, finished = false, hintTimer = null, cell = 30, seq = 0, BX = 0, BY = 0, BW = 1, BH = 1;
  var DEMO = 0, DAILY = 9999, NCOL = 5;
  function today() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function isDemo() { return false; }
  function doneToday() { var g = lsj("ok_gun"); return g && g.d === today() ? g.n | 0 : 0; }
  function quotaLeft() { return Math.max(0, DAILY - doneToday()); }
  /* oynanabilir mi: bitmiş bölümler hep açık; yenisi için demo/günlük hak kontrolü */
  function canPlay(i) {
    if (i >= DEMO && isDemo()) return false;
    if (stars[i] > 0) return true;
    if (i > maxLvl) return false;
    return i < DEMO || quotaLeft() > 0;
  }
  function untilOpen() {
    var ms = 0, h = 0, m = 0;
    if (m === 60) { h++; m = 0; }
    return h > 0 ? h + " saat" + (m ? " " + m + " dakika" : "") : Math.max(1, m) + " dakika";
  }

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function lsj(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  (function loadSave() {
    var m = parseInt(ls("ok_max"), 10), l = parseInt(ls("ok_lvl"), 10), h = parseInt(ls("ok_hint"), 10);
    maxLvl = isNaN(m) ? 0 : Math.max(0, Math.min(N - 1, m));
    lvl = isNaN(l) ? 0 : Math.max(0, Math.min(maxLvl, l));
    hints = isNaN(h) ? 3 : Math.max(0, h);
    stars = lsj("ok_stars") || []; best = lsj("ok_best") || [];
    /* yeni bölümler eklenince: bitirilmiş son bölümün bir sonrakini aç (100'ü bitiren 101'e geçebilsin) */
    for (var q = 0; q < stars.length && q < N; q++) if (stars[q] > 0 && q + 1 > maxLvl) maxLvl = Math.min(N - 1, q + 1);
    if (stars[lvl] > 0 && maxLvl > lvl && !lsj("ok_state")) lvl = maxLvl;
  })();
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function key(x, y) { return x + "," + y; }
  /* ses: ok-ses.js varsa çalar, yoksa hiçbir şey yapmaz (kaldırması kolay) */
  function snd(n, o) { if (window.OkSes) try { window.OkSes.play(n, o); } catch (e) {} }
  function setCls(a, st) { a.g.setAttribute("class", "oka c" + a.c + (st ? " " + st : "")); }
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

  function imza(L) { var h = 0, t = L.w + "x" + L.h + "|" + L.a.join("|"); for (var k = 0; k < t.length; k++) h = (h * 31 + t.charCodeAt(k)) | 0; return String(h); }
  function decode(s) {
    var p = s.split(":"), xy = p[0].split(","), x = +xy[0], y = +xy[1], c = [[x, y]], d = [0, 0];
    for (var i = 0; i < p[1].length; i++) { d = DIR[p[1][i]]; x += d[0]; y += d[1]; c.push([x, y]); }
    return { cells: c, dir: d };
  }
  function rayOf(a) {
    var h = a.cells[a.cells.length - 1], x = h[0] + a.dir[0], y = h[1] + a.dir[1], r = [];
    while (x >= 0 && y >= 0 && x < L.w && y < L.h) { r.push([x, y]); x += a.dir[0]; y += a.dir[1]; }
    return r;
  }
  /* önündeki ilk dolu hücre: yoksa -1 */
  function blockAt(a) { var r = rayOf(a); for (var i = 0; i < r.length; i++) { var o = occ[key(r[i][0], r[i][1])]; if (o !== undefined && o !== a.i) return i; } return -1; }
  function isFree(a) { return !a.gone && blockAt(a) < 0; }

  /* ---- çizim ---- */
  function cx(v) { return v * S + S / 2; }
  function at(P, t) {
    var i = Math.floor(t), f = t - i;
    if (i >= P.length - 1) { var a = P[P.length - 2], b = P[P.length - 1], k = t - (P.length - 1); return [b[0] + (b[0] - a[0]) * k, b[1] + (b[1] - a[1]) * k]; }
    if (i < 0) return P[0];
    return [P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f];
  }
  function shape(a, s) {
    var P = a.path || a.cells, n = a.cells.length, b = s + n - 1, pts = [at(P, s)];
    for (var k = Math.floor(s) + 1; k < b; k++) pts.push(P[k]);
    pts.push(at(P, b));
    var d = "M" + cx(pts[0][0]) + " " + cx(pts[0][1]);
    for (var j = 1; j < pts.length; j++) d += "L" + cx(pts[j][0]) + " " + cx(pts[j][1]);
    a.body.setAttribute("d", d);
    var h = pts[pts.length - 1], hx = cx(h[0]), hy = cx(h[1]), dx = a.dir[0], dy = a.dir[1];
    var tip = [hx + dx * 33, hy + dy * 33], bc = [hx - dx * 6, hy - dy * 6], w = 23;
    a.head.setAttribute("points", tip[0] + "," + tip[1] + " " + (bc[0] - dy * w) + "," + (bc[1] + dx * w) + " " + (bc[0] + dy * w) + "," + (bc[1] - dx * w));
  }
  function render() {
    board.innerHTML = "";
    board.setAttribute("viewBox", (BX * S - S * 0.1) + " " + (BY * S - S * 0.1) + " " + (BW * S + S * 0.2) + " " + (BH * S + S * 0.2));
    var dots = el("g", { "class": "okdots" }, board);
    if (L.s) A.forEach(function (a) { a.cells.forEach(function (c) { el("circle", { cx: cx(c[0]), cy: cx(c[1]), r: 4.5 }, dots); }); });   /* şekilli bölüm: noktalar sadece şeklin içinde */
    else for (var y = 0; y < L.h; y++) for (var x = 0; x < L.w; x++) el("circle", { cx: cx(x), cy: cx(y), r: 4.5 }, dots);
    var g = el("g", { "class": "okarrows" }, board);
    A.forEach(function (a) {
      a.g = el("g", { "class": "oka c" + a.c }, g);
      a.body = el("path", { "class": "okbody" }, a.g);
      a.head = el("polygon", { "class": "okhead" }, a.g);
      if (a.gone) a.g.style.display = "none"; else shape(a, 0);
    });
  }
  function fit() {
    if (!L) return;
    var vh = (window.visualViewport && window.visualViewport.height) || innerHeight;
    var bs = getComputedStyle(document.body), pt = parseFloat(bs.paddingTop) || 0, pb = parseFloat(bs.paddingBottom) || 0;
    stage.style.height = Math.max(380, vh - pt - pb) + "px";
    var ws = getComputedStyle(wrap), px = (parseFloat(ws.paddingLeft) || 0) + (parseFloat(ws.paddingRight) || 0), py = (parseFloat(ws.paddingTop) || 0) + (parseFloat(ws.paddingBottom) || 0);
    var W = wrap.clientWidth - px, H = wrap.clientHeight - py;
    cell = Math.max(16, Math.min(58, Math.floor(Math.min(W / (BW + 0.2), H / (BH + 0.2)))));
    board.style.width = Math.round(cell * (BW + 0.2)) + "px"; board.style.height = Math.round(cell * (BH + 0.2)) + "px";
  }

  /* ---- bölüm ---- */
  function load(i, restore) {
    seq++; snd("level"); lvl = i; L = LEVELS[i]; finished = false; occ = {}; hearts = 3; mistakes = 0; tBefore = 0; clearHint();
    A = L.a.map(function (s, j) { var a = decode(s); a.i = j; a.gone = false; a.busy = false; return a; });
    /* tahta, ızgaranın tamamına değil okların kapladığı alana göre ölçeklenir: şekilli bölümler ortalanır ve büyür */
    var x0 = L.w, y0 = L.h, x1 = 0, y1 = 0; A.forEach(function (a) { a.cells.forEach(function (c) { x0 = Math.min(x0, c[0]); y0 = Math.min(y0, c[1]); x1 = Math.max(x1, c[0]); y1 = Math.max(y1, c[1]); }); });
    if (x1 < x0 || !L.s) { x0 = 0; y0 = 0; x1 = L.w - 1; y1 = L.h - 1; }   /* düz bölümlerde ızgaranın tamamı (noktalar dışarı taşmasın) */
    BX = x0; BY = y0; BW = x1 - x0 + 1; BH = y1 - y0 + 1;
    /* 101'den sonra her 5 bölümde bir renk teması değişir (6 tema döner) */
    document.body.setAttribute("data-okt", i >= 100 ? String(Math.floor((i - 100) / 5) % 6) : "");
    if (restore) {
      var st = lsj("ok_state");
      /* yarım bölüm yalnızca aynı bölüm içeriğine geri yüklenir (bölümler yenilenirse eski yarım kayıt yok sayılır; yıldızlar ve ilerleme etkilenmez) */
      if (st && st.lvl === i && st.n === A.length && (st.sig ? st.sig === imza(L) : i < 100)) {
        (st.gone || []).forEach(function (j) { if (A[j]) A[j].gone = true; });
        hearts = Math.max(1, Math.min(3, st.h | 0)); mistakes = 3 - hearts; tBefore = +st.t || 0;
      }
    }
    /* renkler: birbirine değen oklar farklı renk alsın (açgözlü boyama) */
    var own = {}; A.forEach(function (a) { a.cells.forEach(function (c) { own[key(c[0], c[1])] = a.i; }); });
    A.forEach(function (a) {
      var used = {};
      a.cells.forEach(function (c) { [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var o = own[key(c[0] + d[0], c[1] + d[1])]; if (o !== undefined && o !== a.i && A[o].c !== undefined) used[A[o].c] = 1; }); });
      var start = (a.i * 2 + i) % NCOL; a.c = start;
      for (var q = 0; q < NCOL; q++) { var cc = (start + q) % NCOL; if (!used[cc]) { a.c = cc; break; } }
    });
    A.forEach(function (a) { if (!a.gone) a.cells.forEach(function (c) { occ[key(c[0], c[1])] = a.i; }); });
    left = A.filter(function (a) { return !a.gone; }).length;
    tStart = Date.now();
    $("lvlNo").textContent = pad(i + 1); $("lvlTot").textContent = "/" + N;
    drawHearts(); $("leftNo").textContent = left; $("hintNo").textContent = hints; msg(L.s ? L.e + " " + L.s : "");
    ls("ok_lvl", i);
    fit(); render(); save();
    if (left === 0) win();
  }
  function save() {
    try {
      localStorage.setItem("ok_state", JSON.stringify({ lvl: lvl, n: A.length, sig: imza(L), gone: A.filter(function (a) { return a.gone; }).map(function (a) { return a.i; }), h: hearts, t: elapsed() }));
    } catch (e) {}
  }
  function elapsed() { return tBefore + (finished ? 0 : Date.now() - tStart); }
  function drawHearts() {
    var hs = $("hearts").children;
    for (var i = 0; i < hs.length; i++) hs[i].setAttribute("class", i < hearts ? "on" : "off");
  }
  var msgT = null;
  function msg(t) { var m = $("msg"); m.textContent = t; m.className = "okmsg" + (t ? " show" : ""); clearTimeout(msgT); if (t) msgT = setTimeout(function () { m.className = "okmsg"; }, 1800); }

  /* ---- hareket ---- */
  function anim(dur, step, done) {
    var t0 = 0;
    function f(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / dur); step(p); if (p < 1) requestAnimationFrame(f); else if (done) done(); }
    requestAnimationFrame(f);
  }
  function tap(a) {
    if (!a || a.gone || a.busy || finished || hearts <= 0) return;
    clearHint();
    var b = blockAt(a);
    if (b < 0) slideOut(a); else bump(a, b);
  }
  function slideOut(a) {
    a.gone = true; a.busy = true; left--;
    a.cells.forEach(function (c) { delete occ[key(c[0], c[1])]; });
    var r = rayOf(a), n = a.cells.length, P = a.cells.slice(), h = a.cells[n - 1];
    r.forEach(function (c) { P.push(c); });
    for (var k = 1; k <= n + 2; k++) P.push([h[0] + a.dir[0] * (r.length + k), h[1] + a.dir[1] * (r.length + k)]);
    a.path = P;
    var D = r.length + n + 1, dur = 260 + D * 34;
    setCls(a, "go"); snd("slide", { k: A.length - left - 1 });
    $("leftNo").textContent = left;
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) {}
    anim(dur, function (p) {
      var s = D * Math.pow(p, 1.7); shape(a, s);
      var out = s - r.length; a.g.style.opacity = out > 0 ? Math.max(0, 1 - out / (n + 1)) : 1;
    }, function () { a.g.style.display = "none"; a.busy = false; });
    save();
    if (left === 0) { finished = true; tBefore = tBefore + Date.now() - tStart; var my = seq; setTimeout(function () { if (my === seq) cupid(function () { if (my === seq) win(); }); }, Math.min(dur * 0.55, 420)); }
  }
  function bump(a, b) {
    a.busy = true; mistakes++; hearts = Math.max(0, hearts - 1);
    var r = rayOf(a), hit = A[occ[key(r[b][0], r[b][1])]], n = a.cells.length, P = a.cells.slice(), h = a.cells[n - 1];
    for (var k = 1; k <= b + 2; k++) P.push([h[0] + a.dir[0] * k, h[1] + a.dir[1] * k]);
    a.path = P;
    var reach = b + 0.32, dur = 150 + b * 45;
    setCls(a, "bad");
    if (navigator.vibrate) try { navigator.vibrate([20, 40, 20]); } catch (e) {}
    anim(dur, function (p) { shape(a, reach * (1 - Math.pow(1 - p, 2))); }, function () {
      snd("bump");
      if (hit) { setCls(hit, "hit"); setTimeout(function () { if (!hit.gone) setCls(hit, ""); }, 520); }
      wrap.classList.remove("shake"); void wrap.offsetWidth; wrap.classList.add("shake");
      var hs = $("hearts").children[hearts]; if (hs) hs.setAttribute("class", "lost");
      anim(dur * 1.2, function (p) { shape(a, reach * (1 - p * p)); }, function () {
        a.path = null; shape(a, 0); a.busy = false; setCls(a, "");
        drawHearts(); save();
        if (hearts <= 0) setTimeout(fail, 250); else msg(hearts === 1 ? "Son kalp." : "Önü kapalı.");
      });
    });
  }

  /* ---- Eros'un oku: tahta boşalınca ortada bir kalp belirir, altın bir ok gelip tam ortasına saplanır ---- */
  var HEART = "M12 20.5s-7.5-4.6-7.5-10.6a4.3 4.3 0 0 1 7.5-2.9 4.3 4.3 0 0 1 7.5 2.9c0 6-7.5 10.6-7.5 10.6z";
  function cupid(done) {
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var bw = BW * S, bh = BH * S, m = Math.min(bw, bh), cxp = BX * S + bw / 2, cyp = BY * S + bh / 2 + m * 0.02;
    var hs = m * 0.36 / 15, layer = el("g", { "class": "okcupid" }, board);
    var defs = el("defs", {}, layer), rg = el("radialGradient", { id: "okglow" }, defs);
    el("stop", { offset: "0", "stop-color": "#ff8597", "stop-opacity": ".55" }, rg); el("stop", { offset: "1", "stop-color": "#ff8597", "stop-opacity": "0" }, rg);
    var glow = el("circle", { cx: cxp, cy: cyp, r: m * 0.42, fill: "url(#okglow)", opacity: 0 }, layer);
    var ring = el("circle", { cx: cxp, cy: cyp, r: m * 0.2, fill: "none", stroke: "#ff8597", "stroke-width": 6, opacity: 0 }, layer);
    /* ok: altın gövde, beyaz uç, pembe-lila tüyler; uç (0,0)'da, gövde -x yönünde */
    var ang = -32, len = m * 0.62, arrow = el("g", { opacity: 0 }, layer), ag = el("g", {}, arrow);
    el("path", { d: "M" + (-len) + " 0H-14", stroke: "#f5d17f", "stroke-width": m * 0.022, "stroke-linecap": "round" }, ag);
    el("path", { d: "M2 0L-" + m * 0.075 + " -" + m * 0.04 + "L-" + m * 0.055 + " 0L-" + m * 0.075 + " " + m * 0.04 + "z", fill: "#ffffff" }, ag);
    var fl = m * 0.11, fx = -len + m * 0.02;
    el("path", { d: "M" + fx + " 0l" + fl * 0.5 + " " + -fl * 0.45 + "h" + fl * 0.75 + "l" + -fl * 0.5 + " " + fl * 0.45 + "z", fill: "#ff9db0" }, ag);
    el("path", { d: "M" + fx + " 0l" + fl * 0.5 + " " + fl * 0.45 + "h" + fl * 0.75 + "l" + -fl * 0.5 + " " + -fl * 0.45 + "z", fill: "#d4a8f5" }, ag);
    var heart = el("g", {}, layer), hp = el("path", { d: HEART, fill: "#ff8597", "fill-opacity": ".22", stroke: "#ff8597", "stroke-width": 1.3, "stroke-linejoin": "round" }, heart);
    var shine = el("path", { d: "M7.6 9.2a2.6 2.6 0 0 1 2.6-2.2", fill: "none", stroke: "#fff", "stroke-width": 1.1, "stroke-linecap": "round", opacity: 0 }, heart);
    var parts = [];
    function setHeart(sx, sy) { heart.setAttribute("transform", "translate(" + cxp + " " + cyp + ") scale(" + (hs * sx) + " " + (hs * sy) + ") translate(-12 -12.6)"); }
    function setArrow(dist, rot) {
      var rad = ang * Math.PI / 180, tx = cxp - Math.cos(rad) * dist, ty = cyp - Math.sin(rad) * dist;
      arrow.setAttribute("transform", "translate(" + tx + " " + ty + ") rotate(" + (ang + rot) + ")");
    }
    function burstParts() {
      for (var i = 0; i < 12; i++) {
        var a = (i / 12) * Math.PI * 2 + Math.random() * 0.4, small = i % 3 === 2;
        var g = el("g", {}, layer), p = small ? el("circle", { r: 9, fill: "#ffd27a" }, g) : el("path", { d: HEART, fill: i % 2 ? "#ff8597" : "#ffb3c0" }, g);
        parts.push({ g: g, a: a, d: m * (0.3 + Math.random() * 0.22), s: small ? 1 : (0.18 + Math.random() * 0.12) * m / 100, heart: !small, rot: (Math.random() - 0.5) * 50 });
      }
    }
    if (reduce) { snd("hit"); setHeart(1, 1); hp.setAttribute("fill-opacity", "1"); setArrow(0, 0); arrow.setAttribute("opacity", 1); setTimeout(done, 700); return; }
    setHeart(0.001, 0.001); setArrow(m * 1.3, 0);
    var t0 = 0, T_IN = 420, T_FLY = 430, T_HIT = T_IN + T_FLY, T_END = T_HIT + 1500, impactDone = false;
    function ease(t) { return 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2); }   /* easeOutBack */
    var mySeq = seq;
    function frame(ts) {
      if (mySeq !== seq) return;
      if (!t0) t0 = ts; var t = ts - t0;
      /* 1) kalp belirir */
      var pin = Math.min(1, t / T_IN), sc = ease(pin);
      glow.setAttribute("opacity", Math.min(1, pin * 1.3) * 0.9);
      /* 2) ok uçar (hızlanarak), ucu kalbin ortasında durur */
      if (t > T_IN - 120) {
        var pf = Math.min(1, (t - (T_IN - 120)) / T_FLY);
        arrow.setAttribute("opacity", Math.min(1, pf * 4));
        setArrow(m * 1.3 * (1 - pf * pf * pf), 0);
      }
      /* 3) çarpma: kalp esner, dolar, halka ve küçük kalpler saçılır, ok titrer */
      var sx = sc, sy = sc;
      if (t >= T_HIT) {
        if (!impactDone) { impactDone = true; snd("hit"); hp.setAttribute("fill-opacity", "1"); shine.setAttribute("opacity", ".7"); burstParts(); if (navigator.vibrate) try { navigator.vibrate(25); } catch (e) {} }
        var ti = (t - T_HIT) / 1000, sq = Math.exp(-ti * 7) * Math.sin(ti * 32) * 0.16;
        sx = 1 + sq; sy = 1 - sq;
        var beat = ti > 0.55 ? Math.max(0, Math.sin((ti - 0.55) * Math.PI / 0.22)) * (ti < 0.77 ? 0.09 : 0) + Math.max(0, Math.sin((ti - 0.85) * Math.PI / 0.22)) * (ti > 0.85 && ti < 1.07 ? 0.07 : 0) : 0;
        sx += beat; sy += beat;
        setArrow(0, Math.exp(-ti * 6) * Math.sin(ti * 46) * 5);
        var pr = Math.min(1, ti / 0.6);
        ring.setAttribute("r", m * (0.2 + pr * 0.32)); ring.setAttribute("opacity", (1 - pr) * 0.8); ring.setAttribute("stroke-width", 6 * (1 - pr) + 1);
        parts.forEach(function (q) {
          var pp = Math.min(1, ti / 0.95), d = q.d * (1 - Math.pow(1 - pp, 3)), x = cxp + Math.cos(q.a) * d, y = cyp + Math.sin(q.a) * d - pp * m * 0.05;
          q.g.setAttribute("transform", "translate(" + x + " " + y + ")" + (q.heart ? " rotate(" + q.rot + ") scale(" + q.s + ") translate(-12 -12.6)" : ""));
          q.g.setAttribute("opacity", pp < 0.6 ? 1 : (1 - pp) / 0.4);
        });
      }
      setHeart(sx, sy);
      if (t < T_END) requestAnimationFrame(frame); else done();
    }
    requestAnimationFrame(frame);
  }

  /* ---- ipucu ---- */
  function clearHint() { clearTimeout(hintTimer); A.forEach(function (a) { if (a.g && !a.gone && / tip$/.test(a.g.getAttribute("class"))) setCls(a, ""); }); }
  function hint() {
    if (finished) return;
    if (hints <= 0) { msg("İpucu kalmadı. Her 5 bölümde 1 tane gelir."); return; }
    var free = A.filter(isFree); if (!free.length) return;
    clearHint();
    var a = free[Math.floor(Math.random() * free.length)];
    hints--; ls("ok_hint", hints); $("hintNo").textContent = hints;
    setCls(a, "tip"); snd("hint");
    hintTimer = setTimeout(clearHint, 2600);
  }

  /* ---- sonuç ---- */
  var DONE3 = ["Temiz.", "Hatasız.", "Kusursuz.", "Tek dokunuş boşa gitmedi.", "Kolaydı galiba."];
  var DONE2 = ["Bir kalp eksik.", "Az kalsın kusursuz.", "Fena değil."];
  var DONE1 = ["Kıl payı.", "Son kalple.", "Zor da olsa bitti."];
  var MILE = { 10: "On bölüm. Isınma bitti.", 25: "25. Tahtalar büyüyor.", 50: "Yarı yol.", 75: "75. Bu tahtalar sana yetmiyor galiba.", 100: "100/100. Eros bile bu kadar isabetli değil." };
  function fmt(ms) { var s = Math.round(ms / 1000), m = Math.floor(s / 60); return m + ":" + pad(s % 60); }
  function starSvg(on) { return '<svg viewBox="0 0 24 24" class="' + (on ? "on" : "") + '"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/></svg>'; }
  function win() {
    if (!$("done").hidden && $("doneNext").dataset.mode !== "fail") return;
    finished = true;
    var st = Math.max(1, hearts), t = tBefore, first = !(stars[lvl] > 0), isNewBest = !(best[lvl] > 0) || t < best[lvl];
    stars[lvl] = Math.max(stars[lvl] || 0, st); if (isNewBest) best[lvl] = t;
    if (first && (lvl + 1) % 5 === 0) { hints++; ls("ok_hint", hints); }
    if (first && lvl >= DEMO) ls("ok_gun", JSON.stringify({ d: today(), n: doneToday() + 1 }));
    if (lvl + 1 > maxLvl) maxLvl = Math.min(N - 1, lvl + 1);
    ls("ok_stars", JSON.stringify(stars)); ls("ok_best", JSON.stringify(best)); ls("ok_max", maxLvl);
    try { localStorage.removeItem("ok_state"); } catch (e) {}
    if (lvl + 1 < N) ls("ok_lvl", lvl + 1);
    var pool = st === 3 ? DONE3 : st === 2 ? DONE2 : DONE1;
    $("doneKick").textContent = "Bölüm " + pad(lvl + 1);
    $("doneTitle").textContent = MILE[lvl + 1] || pool[lvl % pool.length];
    $("doneStars").innerHTML = starSvg(st >= 1) + starSvg(st >= 2) + starSvg(st >= 3);
    $("doneStats").innerHTML = "<span><small>Süre</small><b>" + fmt(t) + "</b></span><span><small>En iyi</small><b>" + fmt(best[lvl]) + "</b></span>" + (first && (lvl + 1) % 5 === 0 ? "<span><small>İpucu</small><b>+1</b></span>" : "");
    var last = lvl >= N - 1, nextOk = !last && canPlay(lvl + 1);
    $("doneText").textContent = "";
    if (!last && !nextOk) {
      $("doneTitle").textContent = isDemo() ? "Şimdilik bu kadar." : "Bugünlük bu kadar.";
      if (isDemo()) $("doneText").textContent = "Canın sıkıldığı için " + DEMO + " bölüm açtık. Kalan " + (N - DEMO) + " bölüm pazartesi sabahı açılıyor (" + untilOpen() + " kaldı). Puzzle canavarına 100 bölümü bir anda vermek riskli bulundu :D";
      else $("doneText").textContent = "Bugünkü " + DAILY + " bölüm hakkın doldu. Bölümler bir günde bitmesin diye yönetim kontrole aldı :D Yarın " + DAILY + " bölüm daha.";
    }
    $("doneNext").textContent = last || !nextOk ? "Bölümler" : "Sonraki"; $("doneNext").dataset.mode = nextOk ? "win" : "end";
    $("doneAgain").textContent = "Tekrar";
    $("done").hidden = false;
  }
  function fail() {
    finished = true; snd("fail");
    try { localStorage.removeItem("ok_state"); } catch (e) {}
    $("doneKick").textContent = "Bölüm " + pad(lvl + 1);
    $("doneTitle").textContent = "Kalpler bitti."; $("doneText").textContent = "Önce ucunun önü boş olanları bul, sonra arkadakiler açılır.";
    $("doneStars").innerHTML = "";
    $("doneStats").innerHTML = "";
    $("doneNext").textContent = "Tekrar dene"; $("doneNext").dataset.mode = "fail";
    $("doneAgain").textContent = "Bölümler";
    $("done").hidden = false;
  }
  $("doneNext").onclick = function () {
    var mode = this.dataset.mode; $("done").hidden = true;
    if (mode === "fail") load(lvl, false);
    else if (mode === "end" || lvl >= N - 1) openLevels();
    else load(lvl + 1, false);
  };
  $("doneAgain").onclick = function () {
    var mode = $("doneNext").dataset.mode; $("done").hidden = true;
    if (mode === "fail") openLevels(); else load(lvl, false);
  };

  /* ---- bölüm seçici ---- */
  function openLevels() {
    var g = $("lvlGrid"); g.innerHTML = "";
    for (var i = 0; i < N; i++) {
      var b = document.createElement("button"); b.type = "button";
      var s = stars[i] || 0, open = canPlay(i);
      b.className = (i === lvl ? "cur " : "") + (s ? "done " : "") + (open ? "" : "kilit");
      var dots = ""; for (var q = 0; q < 3; q++) dots += q < s ? "<u class=\"on\"></u>" : "<u></u>";
      b.innerHTML = "<b>" + pad(i + 1) + "</b><i>" + (s ? dots : "") + "</i>";
      b.disabled = !open; b.dataset.i = i;
      b.onclick = function () { $("lvlOv").hidden = true; $("done").hidden = true; load(+this.dataset.i, false); };
      g.appendChild(b);
    }
    $("lvlNote").textContent = "Bölümler sırayla açılır; bitirdiklerini istediğin kadar tekrar oynayabilirsin.";
    $("lvlOv").hidden = false;
    var cur = g.children[lvl]; if (cur && cur.scrollIntoView) try { cur.scrollIntoView({ block: "center" }); } catch (e) {}
  }
  $("lvlBtn").onclick = openLevels; $("bLevels").onclick = openLevels;
  $("lvlClose").onclick = function () { $("lvlOv").hidden = true; };
  $("bRestart").onclick = function () { if (A.some(function (a) { return a.busy; })) return; load(lvl, false); };
  $("bHint").onclick = hint;

  /* ---- dokunma: en yakın okun hücresi (boşluğa denk gelirse yarım hücre tolerans) ---- */
  function pick(ev) {
    var r = board.getBoundingClientRect(), u = r.width / (BW + 0.2);
    var fx = (ev.clientX - r.left) / u - 0.1 + BX, fy = (ev.clientY - r.top) / u - 0.1 + BY, x = Math.floor(fx), y = Math.floor(fy);
    var o = occ[key(x, y)]; if (o !== undefined) return A[o];
    var bestA = null, bd = 0.62;
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      var j = occ[key(x + dx, y + dy)]; if (j === undefined) continue;
      var d = Math.max(Math.abs(fx - (x + dx + 0.5)), Math.abs(fy - (y + dy + 0.5))) - 0.5;
      if (d < bd) { bd = d; bestA = A[j]; }
    }
    return bestA;
  }
  board.addEventListener("pointerdown", function (ev) { if (ev.button > 0) return; ev.preventDefault(); tap(pick(ev)); });

  function refit() { fit(); }
  addEventListener("resize", refit); addEventListener("orientationchange", function () { setTimeout(refit, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", refit);
  addEventListener("pageshow", function () { setTimeout(refit, 60); });
  addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", function () { if (document.hidden) save(); });

  function locked() {
    $("doneKick").textContent = "Bölüm " + pad(Math.min(N, lvl + 2));
    $("doneTitle").textContent = isDemo() ? "Şimdilik bu kadar." : "Bugünlük bu kadar.";
    $("doneStars").innerHTML = ""; $("doneStats").innerHTML = "";
    $("doneText").textContent = isDemo() ? "Canın sıkıldığı için " + DEMO + " bölüm açtık. Kalan " + (N - DEMO) + " bölüm pazartesi sabahı açılıyor, " + untilOpen() + " kaldı. Puzzle canavarına 100 bölümü bir anda vermek riskli bulundu :D" : "Bugünkü " + DAILY + " bölüm hakkın doldu. Bölümler bir günde bitmesin diye yönetim kontrole aldı :D Yarın " + DAILY + " bölüm daha.";
    $("doneNext").textContent = "Bölümler"; $("doneNext").dataset.mode = "end"; $("doneAgain").textContent = "Son bölümü tekrar oyna";
    $("done").hidden = false;
  }
  /* bitmiş bir bölümde kalınmışsa (ör. kilitliyken açılıp kapandıysa) ve sıradaki ilk oynanmamış bölüm artık açıksa, doğrudan ona geç (yarım bırakılmış tekrar oyunu varsa dokunma) */
  (function () { var st = lsj("ok_state"); if (stars[lvl] > 0 && lvl + 1 < N && lvl + 1 === maxLvl && canPlay(lvl + 1) && !(st && st.lvl === lvl && st.gone && st.gone.length)) lvl = lvl + 1; })();
  var startLvl = lvl, wasLocked = !canPlay(lvl) || (stars[lvl] > 0 && lvl + 1 < N && !canPlay(lvl + 1) && maxLvl > lvl);
  while (startLvl > 0 && !canPlay(startLvl)) startLvl--;
  if (ls("ok_intro") !== "1") {
    $("intro").hidden = false; load(startLvl, !wasLocked);
    $("introGo").onclick = function () { $("intro").hidden = true; ls("ok_intro", "1"); tStart = Date.now(); };
  } else {
    load(startLvl, !wasLocked);
    if (wasLocked) locked();
  }

  if (location.hash === "#test") window.__ok = { canPlay: canPlay, load: load, tapIdx: function (i) { tap(A[i]); }, state: function () { return { demo: isDemo(), quota: quotaLeft(), canNext: canPlay(lvl + 1), lvl: lvl, hearts: hearts, left: left, finished: finished, free: A.filter(isFree).map(function (a) { return a.i; }), n: A.length, maxLvl: maxLvl, stars: stars, hints: hints, cell: cell }; } };
})();
