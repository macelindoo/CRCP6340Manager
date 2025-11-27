export const animStrings = {
  part1: "<!DOCTYPE html>\n<html>\n<head>\n<title>",
  part2: "</title>\n</head>\n<body>\n<script>\n",
  part3:
    "class HashSeededRandom {\nconstructor(hash) {\nthis.a = parseInt(hash, 16);\n}\nrand() {\nthis.a |= 0;\nthis.a = this.a + 0x6D2B79F5 | 0;\nlet t = Math.imul(this.a ^ this.a >>> 15, 1 | this.a);\nt = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;\nreturn ((t ^ t >>> 14) >>> 0) / 4294967296;\n}\n}\nconst hashRand = new HashSeededRandom(tokenData.tokenHash.slice(2));\n",
  part4:
    "\n</script>\n<style>\nhtml, body {\nmargin: 0;\npadding: 0;\nheight: 100vh;\noverflow: hidden;\n}\ndiv {\nresize: both;\noverflow: auto;\n}\nh1 {\nvisibility: hidden;\n}</style>\n</body>\n</html>\n",
};
