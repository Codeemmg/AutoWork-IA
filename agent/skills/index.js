const fs = require('fs');
const path = require('path');
const { zodToJsonSchema } = require('zod-to-json-schema');

function loadSkills(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  return files.map(file => {
    const modPath = path.join(dir, file);
    const mod = require(modPath);
    const name = path.basename(file, '.js');
    const description = mod.description || '';
    const parameters = mod.schema ? zodToJsonSchema(mod.schema) : {};
    const exec = mod.exec || mod;
    return { name, description, parameters, exec };
  });
}

const toolsDir = path.join(__dirname, '../../tools');
const agDir = path.join(__dirname, '../../agendamentos');

const skills = [...loadSkills(toolsDir), ...loadSkills(agDir)];

const skillsCatalog = skills.map(s => ({
  name: s.name,
  description: s.description,
  parameters: s.parameters
}));

const skillsMap = {};
skills.forEach(s => {
  skillsMap[s.name] = { exec: s.exec };
});

module.exports = { skillsCatalog, skillsMap };
