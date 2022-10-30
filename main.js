window.addEventListener('load', async function () {
  const nav = document.querySelector('nav > ul');
  const dialog = document.querySelector('main > dialog');

  dialog.addEventListener('click', function (event) {
    const rect = dialog.getBoundingClientRect();
    if (!(rect.top <= event.clientY &&
        event.clientY <= rect.bottom &&
        rect.left <= event.clientX &&
        event.clientX <= rect.right)) {
      dialog.close();
    }
  });

  const recipes = await loadRecipes();
  recipes.forEach(function (recipe) {
    function onclick() {
      const ascii = recipeToAscii(recipe);
      dialog.innerText = ascii;
      dialog.showModal();
    }
    const li = document.createElement('li');
    li.innerHTML = `<a href="#">${recipe.name}</a>`;
    li.onclick = onclick;
    nav.appendChild(li);
  });
});

async function loadRecipes() {
  const resp = await fetch('recipes.json');
  const json = await resp.json();
  return json;
};

function recipeToAscii({ name, steps }) {
  function isIngredient({ item }) { return !!item; }
  function isAction({ items }) { return !!items; }

  const ingredients = steps.filter(isIngredient);
  const actions = steps.filter(isAction);

  const lineStates = ingredients.map(_ => 'unused');
  const positionOfItems = steps.map((step, position) => isIngredient(step) ? position : null);
  const itemsAtPosition = ingredients.map((_, index) => index+1);

  const lines = rightJustifyAll(
    ingredients
      .map(ingredient => `${ingredient.amount} ${ingredient.item} `));

  for (const action of actions) {
    let top, middle, bottom;
    if (action.items.length > 1) {
      top = positionOfItems[action.items[0] - 1];
      bottom = positionOfItems[action.items[action.items.length - 1] - 1];
      middle = Math.floor((top + bottom) / 2);
    }

    for (let position in lines) {
      position = +position;
      const state = lineStates[position];
      switch (state) {
        case 'unused':
        case 'used':
          if (action.items.includes(itemsAtPosition[position])) {
            if (action.items.length > 1) {
              lineStates[position] = 'combined';
              lines[position] += position === top && position === middle
                ? '─┬'
                : position === top
                ? '─┐'
                : position === middle
                ? '─┼'
                : position === bottom
                ? '─┘'
                : '─┤';
              if (position === middle) {
                lineStates[position] = 'used';
                itemsAtPosition[position] = action.step;
                positionOfItems[action.step - 1] = position;
              }
            } else {
              lineStates[position] = 'used';
              lines[position] += '──';
              itemsAtPosition[position] = action.step;
              positionOfItems[action.step - 1] = position;
            }
          } else {
            lines[position] += state === 'used' ? '──' : '··';
          }
          break;
        case 'combined':
          lines[position] += position === middle
            ? ' ├'
            : top <= position && position <= bottom
            ? ' │'
            : '  ';
          if (position === middle) {
            lineStates[position] = 'used';
            itemsAtPosition[position] = action.step;
            positionOfItems[action.step - 1] = position;
          }
          break;
      }
    }
  }

  return lines.join('\n');
};

function rightJustifyAll(lines) {
  function rightJustify(line, length) {
    return ' '.repeat(length - line.length) + line;
  }
  const length = lines.reduce((length, current) => Math.max(length, current.length), 0);
  return lines.map(line => rightJustify(line, length));
};