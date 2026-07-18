/**
 * One-off: re-run the rayon seeder (resets each rayon's name/desc/colour/geometry
 * to the live-staging snapshot — border_color = fill_color = its snapshot colour)
 * and clear the manually-set opacities so all rayons return to the seeder default
 * (one solid colour, fully opaque). tes rayon is user-created and untouched.
 */
import { runProfileCli } from '../src/database/seeds/lib/context';
import { seedRayons } from '../src/database/seeds/entities/rayon';

runProfileCli('demo', async (ctx) => {
  await seedRayons(ctx);
  // The seeder never sets opacity; the default is opaque (NULL).
  await ctx.qr.query(`UPDATE rayons SET fill_opacity = NULL, border_opacity = NULL`);
  ctx.log('✓ rayons reseeded from snapshot + opacities cleared');
});
