const VERSION = "416f4bc357f8697a";
const FILES = ["assets/Bench-B4szKpxB.js","assets/Frame-Baeda3sr.js","assets/GPU-CCgDO5fU.js","assets/Globals-CTebcQwR.js","assets/index-C6VCXAyy.css","assets/index-DZOojEJJ.js","assets/lighting-wWilkQuD.js","assets/world-3ieKE8A8.js","audio/CREDITS.md","audio/bail_click.ogg","audio/big_splash.ogg","audio/bird_dove.ogg","audio/bird_forest.ogg","audio/birds_dawn.ogg","audio/boat_engine.ogg","audio/boat_lap.ogg","audio/boat_rush.ogg","audio/coins.ogg","audio/crickets.ogg","audio/emerge.ogg","audio/fish_flop.ogg","audio/fish_splash.ogg","audio/gull.ogg","audio/hull_slap.ogg","audio/line_out.ogg","audio/line_snap.ogg","audio/line_strain.ogg","audio/palms.ogg","audio/pier_lap.ogg","audio/plop.ogg","audio/reel_drag.ogg","audio/reel_wind.ogg","audio/rod_swish.ogg","audio/splash.ogg","audio/step_grass.ogg","audio/step_rock.ogg","audio/step_sand.ogg","audio/step_water.ogg","audio/step_wetsand.ogg","audio/step_wood.ogg","audio/submerge.ogg","audio/surf_backwash.ogg","audio/surf_crash.ogg","audio/surf_far.ogg","audio/surf_wash.ogg","audio/swim.ogg","audio/tern.ogg","audio/under_reef.ogg","audio/uw_swim.ogg","audio/whale_blow.ogg","audio/whale_song.ogg","audio/wind.ogg","clouds/LICENSING.md","clouds/baseShape64.bin","clouds/blueNoise.bin","index.html","manifest-slavonia.webmanifest","manifest.webmanifest","models/characters/LICENSE-Rocketbox.md","models/characters/joe.glb","models/characters/marta.glb","models/debris/CREDITS.md","models/debris/dead_quiver_branch_01.glb","models/debris/dead_quiver_branch_01_albedo.jpg","models/debris/dead_quiver_branch_01_arm.jpg","models/debris/dead_quiver_branch_01_normal.jpg","models/debris/dead_quiver_branch_02.glb","models/debris/dead_quiver_branch_02_albedo.jpg","models/debris/dead_quiver_branch_02_arm.jpg","models/debris/dead_quiver_branch_02_normal.jpg","models/debris/dead_quiver_trunk.glb","models/debris/dead_quiver_trunk_albedo.jpg","models/debris/dead_quiver_trunk_arm.jpg","models/debris/dead_quiver_trunk_normal.jpg","models/debris/lambis_shell.glb","models/debris/lambis_shell_albedo.jpg","models/debris/lambis_shell_arm.jpg","models/debris/lambis_shell_normal.jpg","models/props/CREDITS.md","models/props/p_WoodenTable_03_0_a.jpg","models/props/p_WoodenTable_03_0_n.jpg","models/props/p_WoodenTable_03_0_r.jpg","models/props/p_fish_knife_0_a.jpg","models/props/p_fish_knife_0_n.jpg","models/props/p_fish_knife_0_r.jpg","models/props/p_fishermans_hat_0_a.jpg","models/props/p_fishermans_hat_0_n.jpg","models/props/p_fishermans_hat_0_r.jpg","models/props/p_life_jacket_0_a.jpg","models/props/p_life_jacket_0_n.jpg","models/props/p_life_jacket_0_r.jpg","models/props/p_lifebuoy_0_a.jpg","models/props/p_lifebuoy_0_n.jpg","models/props/p_lifebuoy_0_r.jpg","models/props/p_metal_jerrycan_green_0_a.jpg","models/props/p_metal_jerrycan_green_0_n.jpg","models/props/p_metal_jerrycan_green_0_r.jpg","models/props/p_metal_toolbox_0_a.jpg","models/props/p_metal_toolbox_0_n.jpg","models/props/p_metal_toolbox_0_r.jpg","models/props/p_plastic_jerrycan_0_a.jpg","models/props/p_plastic_jerrycan_0_n.jpg","models/props/p_plastic_jerrycan_0_r.jpg","models/props/p_wooden_bucket_01_0_a.jpg","models/props/p_wooden_bucket_01_0_n.jpg","models/props/p_wooden_bucket_01_0_r.jpg","models/props/p_wooden_crate_01_0_a.jpg","models/props/p_wooden_crate_01_0_n.jpg","models/props/p_wooden_crate_01_0_r.jpg","models/props/p_wooden_crate_02_0_a.jpg","models/props/p_wooden_crate_02_0_n.jpg","models/props/p_wooden_crate_02_0_r.jpg","models/props/p_wooden_cutting_board_0_a.jpg","models/props/p_wooden_cutting_board_0_n.jpg","models/props/p_wooden_cutting_board_0_r.jpg","models/props/p_wooden_display_shelves_01_0_a.jpg","models/props/p_wooden_display_shelves_01_0_n.jpg","models/props/p_wooden_display_shelves_01_0_r.jpg","models/props/p_wooden_lantern_01_0_a.jpg","models/props/p_wooden_lantern_01_0_n.jpg","models/props/p_wooden_lantern_01_0_r.jpg","models/props/p_wooden_lantern_01_1_a.jpg","models/props/p_wooden_lantern_01_1_n.jpg","models/props/p_wooden_lantern_01_1_r.jpg","models/props/props.bin","models/props/props.json","models/props/s_weathered_brown_planks_a.jpg","models/props/s_weathered_brown_planks_n.jpg","models/props/s_weathered_brown_planks_r.jpg","models/props/s_weathered_peeling_timber_a.jpg","models/props/s_weathered_peeling_timber_n.jpg","models/props/s_weathered_peeling_timber_r.jpg","models/props/s_weathered_planks_a.jpg","models/props/s_weathered_planks_n.jpg","models/props/s_weathered_planks_r.jpg","models/props/s_worn_corrugated_iron_a.jpg","models/props/s_worn_corrugated_iron_n.jpg","models/props/s_worn_corrugated_iron_r.jpg","models/props/signs.png","models/slavonia/houses/kolodvorska642.glb","models/slavonia/houses/opcina.glb","models/slavonia/houses/posta.glb","models/slavonia/houses/school.glb","models/slavonia/houses/shop-kolodvorska.glb","models/slavonia/houses/shrine-kolodvorska.glb","models/slavonia/kit.glb","models/slavonia/st-andrew.glb","models/slavonia/st-roch.glb","models/whale/humpback.bin","models/whale/humpback.json","models/whale/humpback_albedo.png","models/whale/humpback_height.png","textures/smaa/area.png","textures/smaa/search.png","ui/icon-192.png","ui/icon-512.png","ui/keyart-720.jpg","ui/keyart.jpg","world/bosut/index.json","world/bosut/places.json","world/bosut/survey.json","world/bosut/t_670_5006.bin","world/bosut/t_670_5007.bin","world/bosut/t_670_5008.bin","world/bosut/t_670_5009.bin","world/bosut/t_670_5010.bin","world/bosut/t_670_5011.bin","world/bosut/t_670_5012.bin","world/bosut/t_670_5013.bin","world/bosut/t_670_5014.bin","world/bosut/t_670_5015.bin","world/bosut/t_670_5016.bin","world/bosut/t_670_5017.bin","world/bosut/t_670_5018.bin","world/bosut/t_671_5006.bin","world/bosut/t_671_5007.bin","world/bosut/t_671_5008.bin","world/bosut/t_671_5009.bin","world/bosut/t_671_5010.bin","world/bosut/t_671_5011.bin","world/bosut/t_671_5012.bin","world/bosut/t_671_5013.bin","world/bosut/t_671_5014.bin","world/bosut/t_671_5015.bin","world/bosut/t_671_5016.bin","world/bosut/t_671_5017.bin","world/bosut/t_671_5018.bin","world/bosut/t_672_5006.bin","world/bosut/t_672_5007.bin","world/bosut/t_672_5008.bin","world/bosut/t_672_5009.bin","world/bosut/t_672_5010.bin","world/bosut/t_672_5011.bin","world/bosut/t_672_5012.bin","world/bosut/t_672_5013.bin","world/bosut/t_672_5014.bin","world/bosut/t_672_5015.bin","world/bosut/t_672_5016.bin","world/bosut/t_672_5017.bin","world/bosut/t_672_5018.bin","world/bosut/t_673_5006.bin","world/bosut/t_673_5007.bin","world/bosut/t_673_5008.bin","world/bosut/t_673_5009.bin","world/bosut/t_673_5010.bin","world/bosut/t_673_5011.bin","world/bosut/t_673_5012.bin","world/bosut/t_673_5013.bin","world/bosut/t_673_5014.bin","world/bosut/t_673_5015.bin","world/bosut/t_673_5016.bin","world/bosut/t_673_5017.bin","world/bosut/t_673_5018.bin","world/bosut/t_674_5006.bin","world/bosut/t_674_5007.bin","world/bosut/t_674_5008.bin","world/bosut/t_674_5009.bin","world/bosut/t_674_5010.bin","world/bosut/t_674_5011.bin","world/bosut/t_674_5012.bin","world/bosut/t_674_5013.bin","world/bosut/t_674_5014.bin","world/bosut/t_674_5015.bin","world/bosut/t_674_5016.bin","world/bosut/t_674_5017.bin","world/bosut/t_674_5018.bin","world/bosut/t_675_5006.bin","world/bosut/t_675_5007.bin","world/bosut/t_675_5008.bin","world/bosut/t_675_5009.bin","world/bosut/t_675_5010.bin","world/bosut/t_675_5011.bin","world/bosut/t_675_5012.bin","world/bosut/t_675_5013.bin","world/bosut/t_675_5014.bin","world/bosut/t_675_5015.bin","world/bosut/t_675_5016.bin","world/bosut/t_675_5017.bin","world/bosut/t_675_5018.bin","world/bosut/t_676_5006.bin","world/bosut/t_676_5007.bin","world/bosut/t_676_5008.bin","world/bosut/t_676_5009.bin","world/bosut/t_676_5010.bin","world/bosut/t_676_5011.bin","world/bosut/t_676_5012.bin","world/bosut/t_676_5013.bin","world/bosut/t_676_5014.bin","world/bosut/t_676_5015.bin","world/bosut/t_676_5016.bin","world/bosut/t_676_5017.bin","world/bosut/t_676_5018.bin","world/bosut/t_677_5006.bin","world/bosut/t_677_5007.bin","world/bosut/t_677_5008.bin","world/bosut/t_677_5009.bin","world/bosut/t_677_5010.bin","world/bosut/t_677_5011.bin","world/bosut/t_677_5012.bin","world/bosut/t_677_5013.bin","world/bosut/t_677_5014.bin","world/bosut/t_677_5015.bin","world/bosut/t_677_5016.bin","world/bosut/t_677_5017.bin","world/bosut/t_677_5018.bin","world/bosut/t_678_5006.bin","world/bosut/t_678_5007.bin","world/bosut/t_678_5008.bin","world/bosut/t_678_5009.bin","world/bosut/t_678_5010.bin","world/bosut/t_678_5011.bin","world/bosut/t_678_5012.bin","world/bosut/t_678_5013.bin","world/bosut/t_678_5014.bin","world/bosut/t_678_5015.bin","world/bosut/t_678_5016.bin","world/bosut/t_678_5017.bin","world/bosut/t_678_5018.bin","world/bosut/t_679_5006.bin","world/bosut/t_679_5007.bin","world/bosut/t_679_5008.bin","world/bosut/t_679_5009.bin","world/bosut/t_679_5010.bin","world/bosut/t_679_5011.bin","world/bosut/t_679_5012.bin","world/bosut/t_679_5013.bin","world/bosut/t_679_5014.bin","world/bosut/t_679_5015.bin","world/bosut/t_679_5016.bin","world/bosut/t_679_5017.bin","world/bosut/t_679_5018.bin","world/bosut/t_680_5006.bin","world/bosut/t_680_5007.bin","world/bosut/t_680_5008.bin","world/bosut/t_680_5009.bin","world/bosut/t_680_5010.bin","world/bosut/t_680_5011.bin","world/bosut/t_680_5012.bin","world/bosut/t_680_5013.bin","world/bosut/t_680_5014.bin","world/bosut/t_680_5015.bin","world/bosut/t_680_5016.bin","world/bosut/t_680_5017.bin","world/bosut/t_680_5018.bin","world/bosut/t_681_5006.bin","world/bosut/t_681_5007.bin","world/bosut/t_681_5008.bin","world/bosut/t_681_5009.bin","world/bosut/t_681_5010.bin","world/bosut/t_681_5011.bin","world/bosut/t_681_5012.bin","world/bosut/t_681_5013.bin","world/bosut/t_681_5014.bin","world/bosut/t_681_5015.bin","world/bosut/t_681_5016.bin","world/bosut/t_681_5017.bin","world/bosut/t_681_5018.bin","world/bosut/t_682_5006.bin","world/bosut/t_682_5007.bin","world/bosut/t_682_5008.bin","world/bosut/t_682_5009.bin","world/bosut/t_682_5010.bin","world/bosut/t_682_5011.bin","world/bosut/t_682_5012.bin","world/bosut/t_682_5013.bin","world/bosut/t_682_5014.bin","world/bosut/t_682_5015.bin","world/bosut/t_682_5016.bin","world/bosut/t_682_5017.bin","world/bosut/t_682_5018.bin","world/bosut/water.json"];
// The service worker: keeps a whole copy of the built game on the device, so it opens with no
// network at all. The build puts two lines above this file (vite.config.js `offline`): VERSION, a
// hash of everything in the build, and FILES, every file of it.
//
//   install    fetch every file into the cache named for this version, a few at a time, telling
//              the open pages how far it has got
//   activate   drop the caches of older versions and take the open pages over
//   fetch      a page load is the cached index.html whatever its query (?region=...); any other
//              file of the build comes from the cache; what is not ours (the web fonts) is kept
//              as it is first fetched; the network is only the fallback

const CACHE = 'tidewater-' + VERSION, FOREIGN = 'tidewater-foreign';
// how many files are fetched at once while installing
const AT_ONCE = 6;

const tell = async ( message ) => {

	for ( const c of await self.clients.matchAll( { includeUncontrolled: true } ) ) c.postMessage( message );

};

self.addEventListener( 'install', ( event ) => event.waitUntil( ( async () => {

	const cache = await caches.open( CACHE );
	let done = 0;
	const queue = FILES.slice();
	const worker = async () => {

		for ( let file = queue.pop(); file !== undefined; file = queue.pop() ) {

			// what is already there (an install that was cut short) is not fetched again
			if ( ! await cache.match( file ) ) {

				const res = await fetch( file, { cache: 'no-cache' } );
				if ( ! res.ok ) throw new Error( `${ file }: ${ res.status }` );
				await cache.put( file, res );

			}

			done ++;
			tell( { offline: 'saving', done, of: FILES.length } );

		}

	};
	await Promise.all( Array.from( { length: AT_ONCE }, worker ) );
	await self.skipWaiting();

} )() ) );

self.addEventListener( 'activate', ( event ) => event.waitUntil( ( async () => {

	for ( const name of await caches.keys() ) if ( name !== CACHE && name !== FOREIGN ) await caches.delete( name );
	await self.clients.claim();
	tell( { offline: 'ready', version: VERSION } );

} )() ) );

// a page asks whether its copy is complete
self.addEventListener( 'message', ( event ) => {

	if ( event.data === 'offline?' ) event.source.postMessage( { offline: 'ready', version: VERSION } );

} );

self.addEventListener( 'fetch', ( event ) => {

	const req = event.request;
	if ( req.method !== 'GET' ) return;
	const url = new URL( req.url );
	event.respondWith( ( async () => {

		if ( url.origin === self.location.origin ) {

			const cache = await caches.open( CACHE );
			// ( whatever the query, and whatever headers the server said its answer varies by: a script
			// asked for by the page carries an Origin the install's own request did not )
			const hit = await cache.match( req.mode === 'navigate' ? 'index.html' : req, { ignoreSearch: true, ignoreVary: true } );
			return hit || fetch( req );

		}

		// not ours: kept as first fetched, refreshed whenever the network is there
		const cache = await caches.open( FOREIGN ), hit = await cache.match( req );
		const fresh = fetch( req ).then( ( res ) => { cache.put( req, res.clone() ); return res; } );
		if ( ! hit ) return fresh;
		fresh.catch( () => {} );
		return hit;

	} )() );

} );
