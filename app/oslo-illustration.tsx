// Decorative, original vector artwork. The interactive field map supplies geography.
export default function OsloIllustration(){
 return <div className="city-art" aria-hidden="true"><svg viewBox="0 0 320 192" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
   <linearGradient id="osloSky" x1="160" y1="0" x2="160" y2="192" gradientUnits="userSpaceOnUse"><stop stopColor="#213e50"/><stop offset="1" stopColor="#10202e"/></linearGradient>
   <linearGradient id="osloWater" x1="160" y1="130" x2="160" y2="192" gradientUnits="userSpaceOnUse"><stop stopColor="#24546a"/><stop offset="1" stopColor="#162c3f"/></linearGradient>
   <linearGradient id="osloRoof" x1="181" y1="102" x2="251" y2="148" gradientUnits="userSpaceOnUse"><stop stopColor="#f2e0bf"/><stop offset="1" stopColor="#9cbbb8"/></linearGradient>
   <pattern id="osloWindows" width="11" height="12" patternUnits="userSpaceOnUse"><rect x="4" y="3" width="3" height="5" rx=".7" fill="#eac58c" fillOpacity=".7"/></pattern>
  </defs>
  <rect width="320" height="192" rx="20" fill="url(#osloSky)"/>
  <path d="M0 98L25 80L43 87L71 60L88 74L110 65L135 85L159 63L191 87L212 74L247 94L280 68L320 94V142H0Z" fill="#294b55"/>
  <path d="M0 120L29 100L52 110L83 92L114 109L153 96L190 113L238 96L270 112L299 100L320 114V148H0Z" fill="#355a60"/>
  <g stroke="#8cbbb9" strokeOpacity=".16"><circle cx="248" cy="44" r="28"/><circle cx="248" cy="44" r="43"/><path d="M248 0V88M204 44H292"/></g>
  <circle cx="248" cy="44" r="11" fill="#f4ddad"/><circle cx="253" cy="40" r="11" fill="#213e50"/>
  <g fill="#a6c3c4"><circle cx="41" cy="27" r="1.4"/><circle cx="115" cy="32" r="1"/><circle cx="179" cy="19" r="1.2"/><circle cx="291" cy="26" r="1"/><circle cx="208" cy="55" r="1"/></g>
  <path d="M0 146C48 134 71 150 108 141C164 129 218 143 257 132L320 138V192H0Z" fill="url(#osloWater)"/>
  <path d="M0 142H51L61 134H165L177 143H224L234 134H320" stroke="#628982" strokeWidth="4"/>
  <g stroke="#10222e" strokeWidth="2" strokeLinejoin="round">
   <path d="M26 138V87H46V138M69 138V80H90V138" fill="#b47155"/>
   <path d="M30 87V81H43V87M73 80V74H86V80" fill="#d0976a"/>
   <path d="M45 138V106H71V138" fill="#915f4e"/>
   <path d="M30 92H42V132H30ZM73 86H86V132H73Z" fill="url(#osloWindows)" stroke="none"/>
   <path d="M101 136V108L114 99L127 108V136" fill="#ceb38b"/>
   <path d="M111 136V119H117V136" fill="#385867"/>
   <path d="M133 137V87H147V137M151 137V96H167V137M173 137V79H184V137" fill="#527b83"/>
   <path d="M136 93V129M141 93V129M155 102V130M162 102V130M178 85V129" stroke="#aed2c7" strokeWidth="1.5" strokeDasharray="4 5"/>
   <path d="M203 137V89H219V137M223 137V75H237V137M241 137V86H259V137M263 137V100H278V137M282 137V91H299V137" fill="#426774"/>
   <path d="M207 95V129M214 95V129M227 81V130M233 81V130M246 92V130M253 92V130M268 106V129M287 97V130M294 97V130" stroke="#83b5b5" strokeWidth="2" strokeDasharray="5 4"/>
   <path d="M169 147L210 115L266 145L247 154H179Z" fill="url(#osloRoof)"/>
   <path d="M169 147L210 115L204 144L247 154M204 144L266 145" stroke="#759696" strokeWidth="1.2"/>
   <path d="M198 141V127L211 123L236 136V143" fill="#50757c"/>
   <path d="M205 128V141M214 128V142M223 132V142M231 135V142" stroke="#91b3ae" strokeWidth="1"/>
  </g>
  <path d="M15 155C54 164 92 147 126 154C156 160 157 171 198 169C239 167 259 176 306 166" stroke="#78c7c3" strokeOpacity=".4" strokeWidth="1.5"/>
  <path d="M36 179H69M87 171H115M220 184H255M272 157H294" stroke="#8dbdbd" strokeOpacity=".35" strokeLinecap="round"/>
  <g className="city-tram"><path d="M47 145H132" stroke="#ee9b70" strokeWidth="1.5" strokeDasharray="2 4"/><rect x="80" y="133" width="42" height="12" rx="4" fill="#ed855f" stroke="#183340" strokeWidth="1.5"/><path d="M86 136H96V140H86ZM100 136H110V140H100ZM114 136H118V140H114Z" fill="#233f4c"/><circle cx="89" cy="145" r="2" fill="#162c3a"/><circle cx="114" cy="145" r="2" fill="#162c3a"/><path d="M98 133L103 129H111L108 133" stroke="#bcd2c9" strokeWidth="1.2"/></g>
  <g className="city-beacon"><circle cx="159" cy="58" r="16" stroke="#9adac3" strokeOpacity=".15"/><circle cx="159" cy="58" r="9" stroke="#9adac3" strokeOpacity=".5"/><circle cx="159" cy="58" r="3" fill="#a9ead1"/><path d="M159 68V82" stroke="#9adac3" strokeDasharray="2 3"/></g>
 </svg><span>59°55′ N &nbsp; 10°45′ E <i/> OSLO, NORWAY</span></div>;
}
