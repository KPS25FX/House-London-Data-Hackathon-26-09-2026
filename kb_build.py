import json, collections
R=json.load(open('data.json'))['rows']
LP={'Barking and Dagenham':19440,'Barnet':23640,'Bexley':6850,'Brent':23250,'Bromley':7740,'Camden':10380,'City of London':1460,'Croydon':20790,'Ealing':21570,'Enfield':12460,'Greenwich':28240,'Hackney':13280,'Hammersmith and Fulham':16090,'Haringey':15920,'Harrow':8020,'Havering':12850,'Hillingdon':10830,'Hounslow':17820,'Islington':7750,'Kensington and Chelsea':4480,'Kingston upon Thames':9640,'Lambeth':13350,'Lewisham':16670,'Merton':9180,'Newham':32800,'Redbridge':14090,'Richmond upon Thames':4110,'Southwark':23550,'Sutton':4690,'Tower Hamlets':34730,'Waltham Forest':12640,'Wandsworth':19500,'Westminster':9850}
S={ 'LP2021':('The London Plan 2021, Chapter 4 (Housing)','https://www.london.gov.uk/programmes-strategies/planning/london-plan/the-london-plan-2021-online/chapter-4-housing'),
 'LICH26':('Lichfields: Assessing the draft London Plan\'s position on housing (23 Jul 2026)','https://lichfields.uk/blog/2026/july/23/assessing-the-draft-london-plans-position-on-housing-does-it-make-the-grade'),
 'LICH_HDT':('Lichfields: Housing Delivery Test insight','https://lichfields.uk/insight-focus/national-planning-policy-framework-and-the-housing-delivery-test/housing-delivery-test'),
 'LICH_LP5':('Lichfields: As the London Plan turns five (20 Mar 2026)','https://lichfields.uk/blog/2026/march/20/as-the-london-plan-turns-five-will-its-review-create-a-new-beginning-for-housing-delivery'),
 'BP_BARNET':('Barnet Post: The new London Plan punishes Barnet (opinion, 22 Aug 2026)','https://barnetpost.co.uk/2026/08/22/the-new-london-plan-punishes-barnet/'),
 'BP_STARTS':('Barnet Post: Only 5,547 housing starts last year in London (26 Jan 2026, citing Molior)','https://barnetpost.co.uk/2026/01/26/only-5547-housing-starts-last-year-in-london-against-88000-target/'),
 'GOV_H4L':('GOV.UK: Support for Housebuilding in London, policy summary note','https://assets.publishing.service.gov.uk/media/69c3d4dd93cc6e8b87a6f633/Support_for_Housebuilding_in_London_-_Policy_Summary_Note.pdf'),
 'CMS_H4L':('CMS: Homes for London emergency measures','https://cms.law/en/gbr/legal-updates/homes-for-london-emergency-measures-to-unlock-housebuilding-in-the-capital'),
 'WARWICK':('Warwick CAGE: Solving Britain\'s housing crisis, executive summary','https://warwick.ac.uk/fac/soc/economics/research/centres/cage/wheretobuild/solving_britains_housing_crisis_-_executive_summary.pdf'),
 'EC23':('Electoral Commission: 2023 report on the UK electoral registers','https://www.electoralcommission.org.uk/who-we-are-and-what-we-do/our-views-and-research/our-research/accuracy-and-completeness-electoral-registers/2023-report-electoral-registers-uk'),
 'PERS':('Persuasion UK / Focaldata: attitudes to proposed housebuilding (MRP)','https://persuasionuk.org/opinion-maps/housebuilding'),
 'TFL_C':('Trust for London: housing completions by borough','https://trustforlondon.org.uk/data/new-housing-completions/'),
 'HDT25':('GOV.UK: Housing Delivery Test 2025 measurement','https://www.gov.uk/government/publications/housing-delivery-test-2025-measurement'),
 'GOV_CT':('GOV.UK: Long-term empty homes and second homes council tax premiums','https://www.gov.uk/government/publications/long-term-empty-homes-and-second-homes-council-tax-premiums-and-exceptions'),
 'GLA_OA':('GLA: Opportunity Areas','https://www.london.gov.uk/programmes-strategies/planning/implementing-london-plan/opportunity-areas'),
 'TOOL':('This tool: analysis of Forest, WhereToBuild, Datahub and HoC Library data','#method'),
 'DATASET':('Team dataset: Planning London Datahub, MHCLG HDT 2025, net additions, Council Taxbase 2025, PS2 decisions, 2026 borough elections','#method'),
}
K=[]
def add(id,title,tags,text,src): K.append(dict(id=id,title=title,tags=tags,text=text,src=[{'name':S[s][0],'url':S[s][1]} for s in src]))
add('K01','London Plan 2021: targets and affordable housing route',['london','targets','policy','affordable'],
 "The London Plan 2021 set a 10-year target of 522,870 net homes (52,287 a year, 2019/20 to 2028/29), split into borough targets (Table 4.1), with a separate small-sites element (sites under 0.25 ha). Its 'fast track' viability route required 35% affordable housing on most private land and 50% on public land and industrial land.",['LP2021'])
add('K02','Draft London Plan (July 2026): lower target, Green Belt release near stations',['london','targets','policy','green belt','density','outlook'],
 "The draft London Plan published on 23 July 2026 proposes 558,000 homes over ten years (55,800 a year). Lichfields estimates this covers only about 65% of London's assessed need (government figure of about 88,000 a year). Draft Policy PV7 allows Green Belt release on sites within 1,200m (about 15 minutes' walk) of well-connected stations and 400m of high-frequency bus routes. Draft Policy MBUL2 sets minimum density and height ranges. Affordable housing moves to differential thresholds by location and land type. Adoption is expected in 2027 or early 2028. Reported borough changes: Barnet +900 a year, Wandsworth about +700, Tower Hamlets -1,000, Newham -654, Hillingdon and Ealing significant increases (Hillingdon greenfield-led), Bromley reduced.",['LICH26'])
add('K03','Draft London Plan: delivery record and target shifts by borough',['barnet','lewisham','greenwich','barking and dagenham','targets','outlook'],
 "Under the draft plan Barnet's target becomes 32,730 homes for 2028-2038, a 38% rise and the highest in London, including about 7,000 homes on Green Belt, with Mill Hill and Chipping Barnet named as a Green Belt Broad Location for Growth. Barnet Conservative councillors argue high-delivering boroughs are penalised: over 2021-2024 Lewisham delivered 23% of its target (draft cuts it by 16%), Greenwich 39% (cut 1%) and Barking and Dagenham 59% (cut 50%). This is an opinion piece; figures are the authors'.",['BP_BARNET'])
add('K04','Homes for London emergency package (Oct 2025)',['london','policy','viability','affordable','call-in','cil','design','outlook'],
 "Announced 23 October 2025 by the government and the Mayor. A time-limited planning route (validated applications by 31 March 2028) lets private schemes proceed with 20% affordable housing (60% of it social rent), with GLA grant available above the first 10%, if construction reaches first-floor slab within 30 months. Public and industrial land stays at 35%. Temporary relief on borough CIL for eligible schemes (commencing by 31 March 2030, minimum 20% affordable). London Plan Guidance withdrew the dual-aspect standard and the limit of 8 homes per core, and relaxed cycle parking until March 2028. The Mayor can call in schemes of 50+ homes that a borough is minded to refuse, and Green Belt or MOL schemes over 1,000 sqm. A City Hall Developer Investment Fund of about £322-324m targets stalled sites.",['GOV_H4L','CMS_H4L'])
add('K05','London housebuilding collapse: starts, sales and stalled sites',['london','viability','delivery','building safety','outlook'],
 "Molior counted 5,547 private housing starts in London in 2025, down 84% from 33,782 in 2015. Work had stalled on 5,009 homes across 51 sites through contractor insolvency or deliberate holds; only 8,436 new homes sold in 2025. Projected completions were about 18,326 in 2026, falling to about 14,000 a year after. Causes cited: Building Safety Regulator (gateway) delays for tall buildings, high construction costs, slow planning and weak sales at higher interest rates.",['BP_STARTS'])
add('K06','Housing Delivery Test in London (2025 measurement)',['london','hdt','policy','presumption'],
 "The Housing Delivery Test compares completions with requirements over three years. Below 95% a council must publish an action plan, below 85% a 20% buffer applies, and below 75% the presumption in favour of sustainable development applies, weakening its ability to refuse. In the 2025 measurement (published 17 August 2026), 21 of London's 33 planning authorities (32 boroughs plus the City) are under the presumption, 5 have a buffer, 2 need an action plan, and only 5 passed: Barnet, Croydon, Harrow, Wandsworth and Westminster. Tower Hamlets scored 47%, Greenwich 42%, Lambeth 39%, Havering 40% and Redbridge 30%.",['LICH_HDT','HDT25','DATASET'])
add('K07','WhereToBuild: where demand is and where building happened',['london','demand','wheretobuild','densification','wandsworth','islington','camden','hillingdon','hounslow','croydon','bexley','lewisham'],
 "Warwick's WhereToBuild defines the housing gap as people searching for a home minus available properties, and tightness as searchers per available property (from about 20 billion searches and 2019-2024 listings). Nationally, only 29% of new builds since 2010 were in high-demand densification areas, which hold 50% of the gap; densification fell from 48% of new builds in the early 2000s to 16%. In London, Wandsworth neighbourhoods have the highest gap in the country, while parts of Hillingdon, Hounslow and Croydon are in the bottom 1% with oversupply. The report names Wandsworth, Islington and Camden as densification priorities, and Bexley and Lewisham as restrictive boroughs needing reform.",['WARWICK'])
add('K08','Who is on the electoral register: tenure gap',['london','voters','registration','renters'],
 "Electoral Commission estimates (December 2022 registers, Great Britain): 95% of outright owners are correctly registered, 88% of mortgage holders, 79% of social renters and only 65% of private renters. Just 39% of people at their address for under a year are registered, and 60% of 18-19 year olds. Overall completeness is 86%, with 7-8 million people missing or wrongly registered across the UK.",['EC23'])
add('K09','Opposition to housebuilding is a minority everywhere',['london','voters','opinion','nimby'],
 "A Focaldata MRP for Persuasion UK (about 20,000 respondents, July 2024) found opposition to housebuilding is a minority view in every seat in Great Britain: most voters support it or have no view. Organised local opposition can still dominate through planning objections, which is why visible local support matters to councillors and MPs.",['PERS'])
add('K10','Measuring completions: which series to trust',['london','data','completions'],
 "Three official series disagree. Planning London Datahub records about 33,600 homes completed a year across London over 2019/20-2024/25; net additional dwellings (Live Table 122) are broadly consistent for most boroughs but Datahub captures only 51-64% of them in Enfield, Tower Hamlets, Westminster and Haringey; the house-building table (Live Table 253) records far fewer (about 17,800 in the latest year). Trust for London, using net additions, reports 37,768 homes added a year over 2020/21-2022/23, with below-market homes averaging 1,242 a year in Newham, 1,128 in Brent, 34 in Richmond and 48 in Kingston. This tool uses Datahub completions.",['TFL_C','DATASET'])
add('K11','Empty and second homes: council tax levers',['london','policy','empty homes','stock'],
 "Councils can charge premiums on long-term empty homes and, since April 2025, on second homes (up to 100% extra). These are existing levers to bring unused stock back into use without new construction.",['GOV_CT'])
add('K12','Voice test: findings from this tool',['london','voice test','findings','homeowners','registration'],
 "Using Planning London Datahub completions (2019/20-2024/25) against WhereToBuild demand. Across 1,002 neighbourhoods, homes built per existing home do not follow demand (rank correlation -0.10) or prices (-0.13); they rise with public transport access (+0.23) and brownfield capacity (+0.26) and fall where more homes are owner-occupied (-0.28) or have two or more spare bedrooms (-0.28). Across the 75 seats, the build rate falls with owner-occupation (-0.42, p<0.001) and is unrelated to demand (-0.09). Resident concern about housing falls sharply with ownership (-0.65 on the 51 seats with measured polling), and seats with more private renters have fewer registered voters per 100 adults (-0.58).",['TOOL','DATASET'])
add('K14','Missing homes model: how this tool sets what each area should build',['london','model','missing homes','method'],
 "Each neighbourhood's capacity is the build rate achieved by the best-performing fifth of London neighbourhoods with similar public transport access and brownfield capacity (quantile regression at the 80th percentile). That capacity is scaled up or down by WhereToBuild demand per existing home (elasticity 0.5), then calibrated so London's total equals the chosen target: the London Plan 2021 (52,287 a year), the draft London Plan (55,800) or assessed need (about 88,000). Missing homes are the model's figure minus actual Datahub completions, never below zero. At 55,800 a year about 35,000 homes a year are missing across London; at 88,000 about 63,000.",['TOOL'])
add('K13','Opportunity Areas and development corporations',['london','opportunity areas','regeneration','old oak','lldc'],
 "The London Plan steers large-scale growth to Opportunity Areas, typically brownfield land with existing or planned transport. Two Mayoral development corporations have held planning powers: Old Oak and Park Royal (parts of Brent, Ealing, and Hammersmith and Fulham) and the London Legacy Development Corporation around Stratford (parts of Newham, Tower Hamlets, Hackney and Waltham Forest), whose planning powers returned to the boroughs in December 2024.",['GLA_OA','LP2021'])
NOTES={
 'Barking and Dagenham':"Large growth programme led by the council's development company; Barking Riverside is served by the London Overground extension opened in 2022.",
 'Barnet':"Major regeneration at Brent Cross and Colindale. Draft plan makes Barnet's target the highest in London, including Green Belt growth at Mill Hill and Chipping Barnet (see K03).",
 'Bexley':"Named by Warwick as a restrictive borough (K07). Elizabeth line at Abbey Wood improves access in the north of the borough.",
 'Brent':"Wembley Park is one of London's largest build-to-rent schemes; Brent is among the top-delivering boroughs (K10). Part of Old Oak and Park Royal.",
 'Bromley':"About half Green Belt; draft plan reduces its target (K02).",
 'Camden':"Warwick densification priority (K07). Camden's own draft plan proposes about 770 homes a year, around 74% of its London Plan annual figure (Lichfields). Euston and King's Cross are the main growth areas.",
 'City of London':"Very little residential development; below-market delivery about 3 homes a year (K10).",
 'Croydon':"The council issued section 114 (effective bankruptcy) notices in 2020 and 2022 and wound down its housing company Brick by Brick. Warwick finds parts of Croydon oversupplied relative to demand (K07).",
 'Ealing':"Draft plan raises its target (K02). Part of Old Oak and Park Royal; Southall and Acton growth on the Elizabeth line.",
 'Enfield':"Meridian Water is the main regeneration site; the council's Local Plan has proposed Green Belt release at Crews Hill and Chase Park.",
 'Greenwich':"Greenwich Peninsula, Woolwich, Kidbrooke and Thamesmead are major growth areas. Delivered 39% of target over 2021-24 per Barnet councillors (K03).",
 'Hackney':"Hackney Wick came under LLDC planning until December 2024 (K13). Very high renter share and resident concern.",
 'Hammersmith and Fulham':"Earls Court and White City are major regeneration sites; part of Old Oak and Park Royal.",
 'Haringey':"Tottenham Hale and the High Road West regeneration are the main growth areas; the council runs a council-homes building programme.",
 'Harrow':"Growth concentrated in Harrow town centre and Wealdstone.",
 'Havering':"Large Green Belt area; Romford town centre is the main growth location.",
 'Hillingdon':"Draft plan significantly raises its target with a greenfield focus (K02). Warwick finds parts oversupplied relative to demand (K07). Hayes benefits from the Elizabeth line.",
 'Hounslow':"Brentford and the Great West Corridor are growth areas. Warwick finds parts oversupplied relative to demand (K07).",
 'Islington':"Warwick densification priority (K07). Little large-site land; delivery relies on small sites and estate infill.",
 'Kensington and Chelsea':"Lowest London Plan target of any inner borough. The 2017 Grenfell Tower fire led to the Building Safety Act and the Building Safety Regulator gateways now cited as a delivery bottleneck (K05).",
 'Kingston upon Thames':"Below-market delivery about 48 homes a year (K10).",
 'Lambeth':"Vauxhall and Nine Elms are the main growth area; Waterloo also significant.",
 'Lewisham':"Delivered 23% of target over 2021-24 per Barnet councillors, and the draft plan cuts its target by 16% (K03). Named by Warwick as restrictive (K07). The Bakerloo line extension that would unlock Old Kent Road and Lewisham growth is unfunded.",
 'Merton':"Morden town centre and the High Path estate are the main regeneration projects.",
 'Newham':"Top-delivering borough (K10): Royal Docks, Stratford and Canning Town. LLDC planning powers returned in December 2024 (K13). Draft plan cuts its target by 654 a year (K02).",
 'Redbridge':"Ilford town centre is the main growth location, served by the Elizabeth line.",
 'Richmond upon Thames':"Among the lowest London Plan targets and below-market delivery about 34 homes a year (K10), despite some of London's highest demand. Much open land is Metropolitan Open Land.",
 'Southwark':"Canada Water, Elephant and Castle and Old Kent Road (dependent on the Bakerloo line extension) are the main growth areas; long-running estate regeneration such as the Aylesbury estate.",
 'Sutton':"Growth focused on Sutton town centre.",
 'Tower Hamlets':"Highest London Plan target and a top-delivering borough (K10), much of it tall towers on the Isle of Dogs, where Building Safety Regulator delays bite hardest (K05). Draft plan cuts its target by 1,000 a year (K02).",
 'Waltham Forest':"Growth at Blackhorse Lane and Walthamstow; part of the former LLDC area.",
 'Wandsworth':"Warwick finds Wandsworth neighbourhoods have the highest housing gap in the country (K07). Nine Elms and Battersea Power Station are major schemes. Draft plan raises its target by about 700 a year (K02).",
 'Westminster':"High demand but constrained land; the council runs estate regeneration such as Church Street.",
}
B=json.load(open('boroughs.json'))
bor=collections.defaultdict(list)
for r in R: bor[r['borough']].append(r)
i=20
for b in sorted(B):
    x=B[b]; rs=bor.get(b,[]); t_=LP.get(b)
    txt=f"{b}. "
    if t_: txt+=f"London Plan 2021 ten-year target {t_:,} (about {round(t_/10):,} a year). "
    txt+=f"Net additional dwellings 2019/20-2024/25: {x['netAdd6']:,} ({x['netAdd2425']:,} in 2024/25)"+(f", about {round(x['netAdd6']/6/(t_/10)*100)}% of the annual London Plan figure" if t_ else "")+". "
    txt+=f"Housing Delivery Test 2025: {round(x['hdt']*100)}% ({x['hdtCons']}). "
    if x['apprRate'] is not None: txt+=f"Major residential applications approved since 2019: {round(x['apprRate'])}%, {round(x['inTime'])}% decided in time. "
    txt+=f"Planning pipeline since 2019: {x['approved']:,} homes approved, {x['approvedNS']:,} approved but not started, {x['startedNC']:,} under construction, {x['lapsed']:,} lapsed, {x['refused']:,} refused. "
    txt+=f"Stock: {x['owned']:.0f}% owner-occupied, {x['privRent']:.0f}% privately rented, {x['underocc']:.0f}% of homes with 2+ spare bedrooms, {x['overcrowd']:.0f}% overcrowded; {x['pctSecond']:.1f}% second homes and {x['pctEmpty']:.1f}% long-term empty. "
    if x['control']: txt+=f"Council after the May 2026 elections: {x['control']} (largest party {x['largest']}). "
    if rs: txt+=f"Seats mainly in {b}: {', '.join(r['name'] for r in rs)}. "
    txt+=NOTES.get(b,'')
    add(f'K{i}',f'Borough profile: {b}',[b.lower(),'borough'],txt,['LP2021','DATASET']+(['GLA_OA'] if b in NOTES else [])+(['LICH_LP5'] if b=='Camden' else []))
    i+=1
json.dump(K,open('kb.json','w'),separators=(',',':'))
print(len(K), len(open('kb.json').read()))
