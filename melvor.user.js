// ==UserScript==
// @name         Melvor Idle automation
// @namespace    Melvor
// @version      0.12.2.02 (for Melvor 0.12.2)
// @description  Aleviates some of the micro management
// @downloadURL  https://raw.githubusercontent.com/Katorone/AutoMelvorIdle/raw/master/melvor.user.js
// @author       Katorone
// @match        https://melvoridle.com/
// @include      https://melvoridle.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// How to use:
// - Get Tampermonkey: https://www.tampermonkey.net/
// - Follow the steps on the page for your browser to install it.
// - On the Git page: https://github.com/Katorone/AutoMelvorIdle/blob/master/melvor.user.js
//   click the 'Raw'-button (located right above the text area)
// - Tampermonkey should now ask if you wish to install/update this script.
// After installing, updating or changing any configuration values,
// ALWAYS reload the game's page.

// What it does:
//  All features are optional.
//  Feel free to change the settings below to your liking.
//  - Auto loot during combat, even when on a different page.
//    Once the amulet of looting has been found, this feature is disabled.
//  - Auto buy gem gloves, automatically selling gems to pay for them.
//    Unequipping the gem gloves will stop the script from buying more.
//    Keep a comfortable amount of uses in reserve to avoid having to grind
//    for gold after spending all of it on upgrades.
//  - Auto tending fields.
//    Seeds, herbs and trees can be configured to be planted by base XP,
//    mastery, farming level or to replant what's there.
//  - Fields will get composted when needed (mastery < 50)
//  - Configuration to stop using seeds with a certain mastery.
//  - Buy farming areas when they become available. (if money is available)
//  - Sell Bobbys pockets automatically (regardless of gold reserves, see below)
//  - Buy more bank slots when the bank is full, and there's enough gold.
//  - Open birds nests and herb bags.
//  - Keep a configurable amount of gold in reserve.
//    Setting this amount to 0 will effectively disable the automatic top-up.
//    Keep in mind that this script only automatically sells gems to pay for Gem Gloves
//    All other expenses are paid from the reserves in the bank.
//    This inclodes:
//    - Bank slots
//    - Compost
//    - Farming areas
//    This is a design choice because Melvor has many ways to earn gold.
//    Gems are also used for crafting, meaning we don't want to sell them all the time.
//  - Automatically bury bones, while keeping a reserve for crafting.


//
// Options - Feel free to change these.
//

// BANK
// How much money to keep on reserve?
// Aim for at least 4.000.000 when also buying bank slots
var bot_reserveGold = 5000000;
// Sell Bobbys pocket automatically?
var bot_sellGoldBags = true;
// Buy new Bank slots when needed?
// Careful with this setting, this can drain your money fast in early game.
var bot_buyBankSlots = true;

// COMBAT
// Auto loot Enable?
var bot_autoLoot_enabled = true;

// Opening containers automatically will display a popup.
// The script tries to close this popup automatically, but this might
// interrupt other actions you're doing in the bank.
// Sadly there's no real way around this.

// Open bird nests automatically?
var bot_farming_openBirdNests = true;
// Open herb bags automatically?
var bot_farming_openHerbBags = true;


// FARMING
// Enable?
var bot_autoFarm_enabled = true;
// Auto buy new allotments?
var bot_farming_autoBuyAllotments = true;
// Planting options
var bot_plant = {
// - Normal seeds
  'Allotments': {
//   Type, pick one (case sensitive):
//   - "mastery": sorts the seeds according to mastery in them
//   - "tier": sorts the seeds according to their unlock tier
//   - "xp": plants the seed which gives the most base XP/hour.
//           This doesn't take extra harvest(-xp) due to mastery in account.
//   - "replant":  only replants what is manually planted.
    'type': "mastery",
//   Sorting order, pick between (case sensitive):
//   - "ascending" : from low to high
//   - "descending": from high to low
    'order': "descending",
//   Cutoff: any number.
//   This will ignore seeds for planting when your mastery is
//   equal or higher than this number.
//   Setting this to a number higher than 99 will use mastered seeds.
//   This setting is ignored while replanting.
    'cutoff': 99
  },
// - Herb seeds
  'Herbs': {
    'type': "tier",
    'order': "ascending",
    'cutoff': 50
  },
// - Tree seeds
  'Trees': {
    'type': "xp",
    'order': "descending",
    'cutoff': 99
  }
};
// When replant is enabled, the script will remember what is harvested
// and will try to replant.  Once replanted, it will forget which seed
// is assigned to each plot, until the next harvest.
// This allows players to reassign plots freely by destroying seeds and
// planting something manually.

// In the early game, I'd suggest planting the highest tier you can.
// With enough mastery, plants give more seeds than you're using, at which
// point you can opt to replant.  This avoids you having to thieve/fight for more.

// MINING
// Enable automatic buying of Gem gloves?
var bot_buyGemGlove_enabled = true;
// Amount of uses to keep in reserve?
// Have this larger than 2000.
var bot_gemGloveUses = 60000;


// PRAYER
// Bury bones?
var bot_buryBones_enabled = true;
// Amount of bones to keep in reserve?
// 21.600 bones is enough for 12h of crafting.
// - Normal bones
var bot_bonesReserve = 21600;
// - Dragon bones
var bot_dragonBonesReserve = 21600;
// - Magic bones
var bot_magicBonesReserve = 0;
// - Holy dust
var bot_holyDustReserve = 21600;
// - Big bones
var bot_bigBonesReserve = 0;


//
// Code - You probably won't need to change anything here.
//   If you need to, feel free to poke me on the Melvor Discord.
//

'use strict';
(function() {

// GENERAL
  function bot_getBankCount(id) {
    for (let i = 0; i < bank.length; i++) {
      if (bank[i].id === id) {return bank[i].qty;}
    }
    return 0;
  }

  // Adds an item to the sell list, or merges if it's already queued.
  function bot_addSellList(id, amount) {
    for (let i = 0; i < bot_sellList.length; i++) {
      if (bot_sellList[i][0] === id) {
        bot_sellList[i][1] += amount;
        return;
      }
    }
    bot_sellList.push([id, amount]);
  }

  // Try to sell gems, but keep an equal amount of each in the bank.
  function bot_sellGems(target_gold) {
    // Create an easy to navigate structure
    let bank_gems = [];
    let to_sell = {};
    let value = 0;
    for (let i = 0; i < bot_gemList.length; i++) {
      let id = bot_gemList[i];
      let amount = bot_getBankCount(id);
      bank_gems.push([id, amount, items[id].sellsFor]);
      to_sell[id] = {};
      // Little hack to always keep 1 gem in the bank.
      to_sell[id].amount = -1;
      value = value + ((amount-1) * items[id].sellsFor);
    }
    // If selling all gems doesn't match target_gold, stop.
    if (value < target_gold) {return;}

    let sell_value = 0;
    // Add gems to sell until the target gold is reached
    while (sell_value < target_gold) {
      // Sort bank_gems on amount
      bank_gems.sort(function(a,b) {return b[1] - a[1];})
      // Add gems to the selling queue
      bank_gems[0][1]--;
      sell_value = sell_value + bank_gems[0][2];
      bot_addSellList(bank_gems[0][0], 1)
    }
  }

// COMBAT
  function lootContainer() {
    lootAll();
  }

// FARMING
  function bot_findStoredSeed(area, patch) {
    // Item id of the seed
    let id = botSeedStorage[area][patch];
    if (id === -1 || bot_getBankCount(id) < items[id].seedsRequired) {
      return -1;
    } else {
      return botSeedStorage[area][patch];
    }
  }

  function bot_pickSeed(area, patch) {
    let type = newFarmingAreas[area].areaName;
    // If we're replanting, don't waste cycles on filtering & sorting
    if (bot_plant[type]["type"]==="replant") {
      return bot_findStoredSeed(area, patch);
    }
    // Remove the seeds that are too high level
    bot_plant[type]["seeds"] = bot_plant[type]["seeds"].filter(
      (i) => skillLevel[CONSTANTS.skill.Farming] >= i.level
    );
    // Remove the seeds we don't have enough of in the bank
    bot_plant[type]["seeds"] = bot_plant[type]["seeds"].filter(
      (i) => bot_getBankCount(i.itemID) >= items[i.itemID].seedsRequired
    );
    // Remove the cutoff seeds from the list
    bot_plant[type]["seeds"] = bot_plant[type]["seeds"].filter(
      (i) => farmingMastery[items[i.itemID].masteryID].mastery < bot_plant[type]["cutoff"]
    );
    // If no seeds survived the filters, replant instead.
    if (bot_plant[type]["seeds"].length === 0) {
      return bot_findStoredSeed(area, patch);
    }
    // Sort the remaining seeds according to the config
    if (bot_plant[type]["type"]==="xp") {
      // Default sort on base XP/h, highest -> lowest timeToGrow
      bot_plant[type]["seeds"].sort((a, b) => 
        (items[b.itemID].farmingXP / items[b.itemID].timeToGrow) -
        (items[a.itemID].farmingXP / items[a.itemID].timeToGrow)
      );
    }
    if (bot_plant[type]["type"]==="tier") {
      // Default sort on tier, highest -> lowest
      bot_plant[type]["seeds"].sort((a, b) => items[b.itemID].farmingLevel - items[a.itemID].farmingLevel);
    }
    if (bot_plant[type]["type"]==="mastery") {
      // Default sort on mastery, highest -> lowest
      bot_plant[type]["seeds"].sort((a, b) => farmingMastery[items[b.itemID].masteryID].masteryXP - farmingMastery[items[a.itemID].masteryID].masteryXP);
    }
    if (bot_plant[type]["order"]==="ascending") {
      // Reverse the sort order if configured.
      bot_plant[type]["seeds"].reverse();
    }
    // Plant the first seed that remains in the list.
    return bot_plant[type]["seeds"][0].itemID;
  }

  function bot_addCompost(area, patch, seed) {
    let required_compost = Math.max(0, (100 - newFarmingAreas[area].patches[patch].compost)/20);
    // If compost is already added, plant.
    if (required_compost === 0) { return true; }
    // If mastery > 50, don't buy compost and proceed to planting
    if (farmingMastery[items[seed].masteryID].mastery > 50) { return true; }
    // If the farming cape is equipped, apply free compost.
    if (equippedItems[CONSTANTS.equipmentSlot.Cape] === CONSTANTS.item.Farming_Skillcape) {
      addCompost(area, patch, required_compost);
      return false;
    }
    // If we own the skillcape but it isn't equipped, equip it, skip a second.
    if (!isInCombat && getBankId(CONSTANTS.item.Farming_Skillcape) !== false) {
      equippedCape = equippedItems[CONSTANTS.equipmentSlot.Cape];
      // Try and equip the cape. This will fail if the bank is full.
      // In this scenario the script won't plant anything.
      // TODO : avoid this scenario
      equipItem(getBankId(CONSTANTS.item.Farming_Skillcape), CONSTANTS.item.Farming_Skillcape, 1, selectedEquipmentSet);
      return false;
    }
    // Do we need to buy compost?
    // Avoid wasting seeds by not planting if we can't afford compost
    let to_buy = required_compost - bot_getBankCount(CONSTANTS.item.Compost);
    if (to_buy > 0) {
      let oldBuyQty = buyQty; buyQty = to_buy; buyCompost(); buyQty = oldBuyQty;
      return false;
    }
    // All conditions should be met. Apply the compost.
    addCompost(area, patch, required_compost);
    return false;
  }

  function bot_plantField(area, patch, seed) {
    selectedPatch = [area, patch];
    selectedSeed = seed;
    // Reset the stored seed, so plots can be reassigned by the player.
    botSeedStorage[area][patch] = -1;
    plantSeed();
  }

  function tendFields() {
    var untended = 0;
    for (let area = 0; area < newFarmingAreas.length; area++) {
      for (let patch = 0; patch < newFarmingAreas[area].patches.length; patch++) {
        // If the patch isn't unlocked, try to unlock it.
        if (!newFarmingAreas[area].patches[patch].unlocked && bot_farming_autoBuyAllotments) {
          unlockPlot(area, patch);
          // Stop the script so the game can update.
          return true;
        }
        // If the patch has a grown plant, harvest it.
        if (newFarmingAreas[area].patches[patch].hasGrown) {
          // store the seed for replanting
          botSeedStorage[area][patch] = newFarmingAreas[area].patches[patch].seedID;
          harvestSeed(area, patch);
          return true;
        }
        if (newFarmingAreas[area].patches[patch].seedID === 0) {
          untended += 1;
          // Check available seeds
          let seed = bot_pickSeed(area, patch);
          console.log("Seed = "+seed);
          // Can't find a seed, proceed to the next area
          if (seed === -1) {continue;}
          // Compost if needed, if compost had to be bought, skip a second.
          if (bot_addCompost(area, patch, seed)) {
            console.log("trying to plant");
            bot_plantField(area, patch, seed);
          }
          return true;
        }
      }
    }
    // Nothing needs to be done, unequip the skill cape if needed.
    if (untended === 0 && equippedCape > 0) {
      // Repeat until it actually worked (eg bank full)
      if (equippedItems[CONSTANTS.equipmentSlot.Cape]===equippedCape) {
        equippedCape = 0;
        return true;
      }
      equipItem(getBankId(equippedCape), equippedCape, 1, selectedEquipmentSet);
    }
  }

// MINING
  function bot_checkGloves() {
    // Are we mining? - Do this check to avoid spending saved gp
    if (!isMining) {return;}
    // Is the gem glove equipped? - Same reason
    if (equippedItems[CONSTANTS.equipmentSlot.Gloves] !== CONSTANTS.item.Gem_Gloves) {return;}
    // How many uses left?
    let uses_left = glovesTracker[CONSTANTS.shop.gloves.Gems].remainingActions;
    let to_buy = Math.ceil((bot_gemGloveUses - uses_left)/2000)
    // Quit if we don't need more gloves.
    if (to_buy <= 0) {return;}
    let price = glovesCost[CONSTANTS.shop.gloves.Gems];
    // Buy one if we can afford it
    if (gp >= price) {
      buyGloves(CONSTANTS.shop.gloves.Gems);
      return;
    }
    // Do we need to sell gems?
    if (gp < price) {
      bot_sellGems(price - gp);
    }
  }

  function bot_checkBones(b = 0) {
    if (b < bot_bones.length) {
      let boneId = bot_bones[b][0];
      let keep = bot_bones[b][1];
      let inBank = bot_getBankCount(boneId);
      let bury = inBank - keep;
      // The code allows us to bypass the 10 bones minimum,
      // but let's not cheat.
      if (inBank > 10 && bury > 0) {
        buryItem(getBankId(boneId), boneId, bury);
      }
      // Delay checking the next bone, so the bank can update.
      // bankIds shift when all of an item is sold.
      setTimeout(bot_checkBones(b+1),100);
    }
  }

  var bot_sellList = [];
  var bot_gemList = [128, 129, 130, 131, 132];
  var bot_bones = [
    [439, bot_bonesReserve],
    [440, bot_dragonBonesReserve],
    [441, bot_magicBonesReserve],
    [500, bot_holyDustReserve],
    [506, bot_bigBonesReserve]
  ];

  const bot_birdsNest = 119;
  const bot_herbsBag = 620;
  const bot_goldBag = 482;
  var botSeedStorage = {};
  var equippedCape = 0;

  // Delay 10 seconds to allow the game to load.
  setTimeout(function() {

    notifyPlayer(11, "Automation started.");

    // Set up the farming data
    if (bot_autoFarm_enabled) {
      loadSeeds();
      // Create seed choice storage
      for (let area = 0; area < newFarmingAreas.length; area++) {
        botSeedStorage[area] = {};
        for (let patch = 0; patch < newFarmingAreas[area].patches.length; patch++) {
          botSeedStorage[area][patch] = -1;
        }
      }
    }
    // Do actions every second.
    var mediumLoop = setInterval(function() {
      // Pick up loot, if enabled.
      if (bot_autoLoot_enabled && isInCombat === true && itemStats[CONSTANTS.item.Amulet_of_Looting].timesFound === 0) {
        lootContainer();
      }
      // Harvest & replant farms, if enabled.
      if (bot_autoFarm_enabled) {
        // Store seeds internally
        bot_plant['Allotments']['seeds'] = [...allotmentSeeds];
        bot_plant['Herbs']['seeds'] = [...herbSeeds];
        bot_plant['Trees']['seeds'] = [...treeSeeds];
        tendFields();
      }
      // Does anything need selling?
      let sell = bot_sellList.shift();
      if (sell) {
        sellItem(getBankId(sell[0]), sell[1]);
      }
    }, 1000)

    // Do actions every minute.
    var slowLoop = setInterval(function() {
      // Try buying a bank slot
      if (bot_buyBankSlots === true &&
          bank.length >= (baseBankMax + bankMax)) {
        let cost = Math.min(newNewBankUpgradeCost.level_to_gp(currentBankUpgrade+1), 4000000);
        // Buy if we have enough gold.
        if (gp >= cost) {
          upgradeBank();
          // Stop script to let the game update.
          return true;
        }
      }
      // Sell Bobbys pocket
      if (bot_sellGoldBags === true) {
        let c = bot_getBankCount(bot_goldBag);
        if (c > 0) {bot_addSellList(bot_goldBag, c);}
      }
      // Open bird nests
      if (bot_farming_openBirdNests === true) {
        let c = bot_getBankCount(bot_birdsNest);
        if (c > 0) {
          openBankItem(getBankId(bot_birdsNest), bot_birdsNest, true)
          // Close the popup
          setTimeout(function() {
            document.getElementsByClassName("swal2-confirm")[0].click();
          }, 100);
        }
      }
      // Open herb sacks
      if (bot_farming_openHerbBags === true) {
        let c = bot_getBankCount(bot_herbsBag);
        if (c > 0) {
          openBankItem(getBankId(bot_herbsBag), bot_herbsBag, true)
          // Close the popup
          setTimeout(function() {
            document.getElementsByClassName("swal2-confirm")[0].click();
          }, 100);
        }
      }
      // Make sure our money reserves are replenished
      if (gp < bot_reserveGold) {
        bot_sellGems(bot_reserveGold - gp);
      }
      // One gem glove lasts at least 750 seconds.
      if (bot_buyGemGlove_enabled) {
        bot_checkGloves();
      }
      // Bury bones.
      if (bot_buryBones_enabled) {
        bot_checkBones();
      }
      /* Convenience for Daedalus
      let knightLoot = [63, 64, 65, 66, 71, 72, 73, 74, 79, 80, 81, 82, 134, 135, 136, 137, 87, 88, 89, 90, 95, 96, 97, 98, 104, 105];
      for (let i = 0; i < knightLoot.length; i++) {
        let c = bot_getBankCount(knightLoot[i]);
        if (c > 0) {
          bot_addSellList(knightLoot[i], c)
        }
      }
      */
    }, 60000)

    console.log("Started automation.");
  }, 10000);
})();
