let chai = require("chai");

suite("Plinko simulation", function() {
  this.timeout(60000);

  test("ball lands in the intended bucket almost always", async function() {
    let plinko = await import("../public/js/modes/plinko.js");
    let pegs = plinko.makePegs();
    let hits = 0;
    let runs = 0;

    for (let buckets of [2, 5, 8, 12]) {
      for (let target = 0; target < buckets; target++) {
        for (let rep = 0; rep < 6; rep++) {
          let sim = plinko.createSim(buckets, target, pegs);
          for (let i = 0; i < 20 * 240 && !sim.done; i++) sim.step(1 / 240);
          chai.assert.isTrue(sim.done, "simulation should finish");
          chai.assert.isAtLeast(sim.bucket, 0);
          chai.assert.isBelow(sim.bucket, buckets);
          runs++;
          if (sim.bucket === target) hits++;
        }
      }
    }
    console.log(`      plinko hit rate: ${hits}/${runs}`);
    chai.assert.isAtLeast(hits / runs, 0.9);
  });
});
