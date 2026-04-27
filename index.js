const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const fetch = require('node-fetch');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

let violations = {};
if (fs.existsSync('violations.json')) {
  violations = JSON.parse(fs.readFileSync('violations.json'));
}

// BAD WORD LIST
const badWords = ["baal, shalla, gandulal, khankir_chele, khankir chele, khankirchele, khankir_pola, khankir pola, khankirpola, gadha, bolod, pagol, murgi, faltu, chapri, oshobho, beadob, bal, shala, bokachoda, gandu, khanki, khankir chele, magir chele, harami, bejonmo, chudmarani, badjat, khisti, noob, loser, pagal, gadha, bolod, fatu, chapri, bokachoda, khanki, gandu, bal, shala, harami, magi, khankir chele, khistir, bejonmo, fuck, shit, bitch, asshole, bastard, mc, bc, chutiya, randi, madarchod, gali, kukur, tori, lado, idiot, stupid, dumb, 死, 笨蛋, 傻, 他妈的, 混蛋, くそ, ばか, 개새끼, 바보"];

function normalize(text){
  return text.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/(.)\1+/g,'$1');
}

function containsBadWord(text){
  const clean = normalize(text);
  return badWords.some(w => clean.includes(w));
}

function advancedCheck(text){
  return /(f\W*u\W*c\W*k|s\W*h\W*i\W*t)/i.test(text);
}

async function aiModeration(text){
  try{
    const res = await fetch("https://api.openai.com/v1/moderations",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model:"omni-moderation-latest",
        input:text
      })
    });
    const data = await res.json();
    return data.results?.[0]?.flagged || false;
  }catch{
    return false;
  }
}

client.on("ready", ()=>{
  console.log("💀 REGIX GOD MODE READY:", client.user.tag);
});

client.on("messageCreate", async (message)=>{
  if(message.author.bot) return;

  const isBad = containsBadWord(message.content) || advancedCheck(message.content) || await aiModeration(message.content);

  if(!isBad) return;

  await message.delete();

  const id = message.author.id;
  violations[id] = (violations[id] || 0) + 1;
  fs.writeFileSync("violations.json", JSON.stringify(violations,null,2));

  // DM EMBED WARNING
  const embed = new EmbedBuilder()
    .setTitle("🚨 REGIX SECURITY WARNING")
    .setDescription("You violated server rules.\n\nStrike: " + violations[id] + "/3\n\n1 more and you may be banned.")
    .setThumbnail("https://cdn.discordapp.com/attachments/1340214088525152279/1496919205059100793/freepik_a-professional-tech-logo-_2748365049.png")
    .setImage("https://cdn.discordapp.com/attachments/1340214088525152279/1496925830272520202/standard.gif")
    .setColor("Red")
    .setFooter({ text: "Regix Studio GOD MODE" });

  try{
    await message.author.send({ embeds:[embed] });
  }catch{}

  if(message.member?.moderatable){
    await message.member.timeout(86400000,"Bad language");
  }

  if(violations[id] >= 3 && message.member?.bannable){
    await message.member.ban({reason:"3 strikes"});
  }
});

client.login(TOKEN);
