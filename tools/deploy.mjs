// Publish the built game to the `deploy` branch: nothing but the files of the build, at the root of
// the branch, for a static host to serve as they are (no build step on the server).
//
//   npm run deploy                 build, commit the build to `deploy`, push it
//   TIDEWATER_DEPLOY_DIR=<dir>     where the branch is checked out meanwhile (default: .deploy here)
//
// The branch has no history in common with the source: each publish is one commit on top of the
// last, saying which source commit it was built from.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BRANCH = 'deploy';
const dir = resolve( process.env.TIDEWATER_DEPLOY_DIR || '.deploy' );
const git = ( args, cwd = process.cwd() ) => execFileSync( 'git', args, { cwd, encoding: 'utf8' } ).trim();
const run = ( cmd, args ) => execFileSync( cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' } );

const source = git( [ 'rev-parse', '--short', 'HEAD' ] );
const dirty = git( [ 'status', '--porcelain', '--', 'src', 'public', 'index.html', 'vite.config.js' ] );
if ( dirty ) throw new Error( 'uncommitted changes in what the build is made of: commit them first, so the build names its source\n' + dirty );

run( 'npm', [ 'run', 'build' ] );

// the branch checked out beside the source: the remote's if it has one, a new empty one if not
if ( ! existsSync( join( dir, '.git' ) ) ) {

	git( [ 'worktree', 'prune' ] );
	const remote = git( [ 'ls-remote', '--heads', 'origin', BRANCH ] );
	if ( remote ) { git( [ 'fetch', 'origin', BRANCH ] ); git( [ 'worktree', 'add', '-B', BRANCH, dir, 'origin/' + BRANCH ] ); }
	else git( [ 'worktree', 'add', '--orphan', '-b', BRANCH, dir ] );

}

// the build replaces whatever the branch held
for ( const name of readdirSync( dir ) ) if ( name !== '.git' ) rmSync( join( dir, name ), { recursive: true, force: true } );
cpSync( 'dist', dir, { recursive: true } );
git( [ 'add', '-A' ], dir );
if ( ! git( [ 'status', '--porcelain' ], dir ) ) { console.log( `deploy: nothing changed since the last publish (source ${ source })` ); process.exit( 0 ); }
git( [ 'commit', '-q', '-m', `Build of ${ source }` ], dir );
git( [ 'push', '-q', 'origin', BRANCH ], dir );
console.log( `deploy: pushed the build of ${ source } to ${ BRANCH } (${ git( [ 'rev-parse', '--short', 'HEAD' ], dir ) })` );
