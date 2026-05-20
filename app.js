const PLAN_PATH = "./data/meal-plan.md";
const RECIPES_INDEX_PATH = "./data/recipes/index.md";

const weekLabel = document.getElementById("week-label");
const daySelect = document.getElementById("day-select");
const dayPlan = document.getElementById("day-plan");
const shoppingList = document.getElementById("shopping-list");
const recipeDetail = document.getElementById("recipe-detail");

const toNumber = (value) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.includes("/")) {
    const [a, b] = trimmed.split("/").map(Number);
    if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a / b;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatAmount = (amount) => {
  if (amount === null || amount === undefined) return "";
  if (Number.isInteger(amount)) return String(amount);
  return amount.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
};

const parseTopLevelBullets = (block) =>
  block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));

const section = (markdown, headingLevel, headingName) => {
  const pattern = new RegExp(
    `^${"#".repeat(headingLevel)} ${headingName}\\s*$([\\s\\S]*?)(?=^${"#".repeat(headingLevel)} |^${"#".repeat(headingLevel - 1)} |\\Z)`,
    "m"
  );
  const match = markdown.match(pattern);
  return match ? match[1].trim() : "";
};

const parsePlan = (markdown) => {
  const weekOfMatch = markdown.match(/^- week_of:\s*(.+)$/m);
  const recipeFolderMatch = markdown.match(/^- recipe_folder:\s*(.+)$/m);
  const daysBlock = section(markdown, 2, "Days");
  const dayChunks = daysBlock
    .split(/^### /m)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const days = dayChunks.map((chunk) => {
    const [nameLine, ...rest] = chunk.split("\n");
    const body = rest.join("\n");
    const field = (key) => {
      const match = body.match(new RegExp(`^- ${key}:\\s*(.+)$`, "m"));
      return match ? match[1].trim() : "";
    };
    const listField = (key) => {
      const match = body.match(new RegExp(`^- ${key}:\\s*\\n([\\s\\S]*?)(?=^- [a-z_]+:|\\Z)`, "m"));
      return match ? parseTopLevelBullets(match[1]) : [];
    };

    return {
      name: nameLine.trim(),
      recipe: field("recipe"),
      prep: listField("prep"),
      cook: listField("cook"),
      split: listField("split"),
      eat: listField("eat"),
    };
  });

  return {
    weekOf: weekOfMatch ? weekOfMatch[1].trim() : "Unknown week",
    recipeFolder: recipeFolderMatch ? recipeFolderMatch[1].trim() : "./data/recipes",
    days,
  };
};

const parseRecipe = (slug, markdown) => {
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const sourceMatch = markdown.match(/^- source:\s*(.+)$/m);
  const ingredientsBlock = section(markdown, 2, "Ingredients");
  const stepsBlock = section(markdown, 2, "Steps");

  const ingredients = ingredientsBlock
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => {
      const [amountPartRaw, itemRaw] = line.slice(2).split("|").map((part) => (part || "").trim());
      const amountParts = amountPartRaw.match(/^([\d./]+)?\s*(.*)$/);
      const amount = amountParts ? toNumber(amountParts[1]) : null;
      const unit = amountParts ? (amountParts[2] || "").trim() : "";
      return {
        amount,
        unit,
        item: itemRaw || amountPartRaw,
      };
    });

  const steps = stepsBlock
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^\d+\.\s+/, ""));

  return {
    slug,
    title: titleMatch ? titleMatch[1].trim() : slug,
    source: sourceMatch ? sourceMatch[1].trim() : "",
    ingredients,
    steps,
  };
};

const renderDay = (day, recipe) => {
  dayPlan.replaceChildren();
  recipeDetail.replaceChildren();

  const title = document.createElement("h3");
  title.textContent = day.name;
  dayPlan.appendChild(title);

  ["prep", "cook", "split", "eat"].forEach((key) => {
    const heading = document.createElement("h4");
    heading.textContent = key[0].toUpperCase() + key.slice(1);
    dayPlan.appendChild(heading);

    const list = document.createElement("ul");
    day[key].forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    dayPlan.appendChild(list);
  });

  const recipeTitle = document.createElement("h3");
  recipeTitle.textContent = recipe.title;
  recipeDetail.appendChild(recipeTitle);

  if (recipe.source) {
    const source = document.createElement("a");
    source.href = recipe.source;
    source.target = "_blank";
    source.rel = "noreferrer";
    source.textContent = "Source recipe";
    recipeDetail.appendChild(source);
  }

  const ingredientHeading = document.createElement("h4");
  ingredientHeading.textContent = "Ingredients";
  recipeDetail.appendChild(ingredientHeading);

  const ingredientList = document.createElement("ul");
  recipe.ingredients.forEach((ingredient) => {
    const li = document.createElement("li");
    const amount = ingredient.amount !== null ? `${formatAmount(ingredient.amount)} ` : "";
    const unit = ingredient.unit ? `${ingredient.unit} ` : "";
    li.textContent = `${amount}${unit}${ingredient.item}`.trim();
    ingredientList.appendChild(li);
  });
  recipeDetail.appendChild(ingredientList);

  const stepHeading = document.createElement("h4");
  stepHeading.textContent = "How to cook";
  recipeDetail.appendChild(stepHeading);

  const stepList = document.createElement("ol");
  recipe.steps.forEach((step) => {
    const li = document.createElement("li");
    li.textContent = step;
    stepList.appendChild(li);
  });
  recipeDetail.appendChild(stepList);
};

const buildShoppingList = (recipes, weekOf) => {
  const totals = new Map();

  recipes.forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      const key = `${ingredient.item.toLowerCase()}|${ingredient.unit.toLowerCase()}`;
      const existing = totals.get(key) || { ...ingredient };
      if (existing.amount !== null && ingredient.amount !== null) {
        existing.amount += ingredient.amount;
      } else if (existing.amount === null && ingredient.amount !== null) {
        existing.amount = ingredient.amount;
      }
      totals.set(key, existing);
    });
  });

  shoppingList.replaceChildren();
  const storageKeyPrefix = `shopping:${weekOf}:`;

  [...totals.values()]
    .sort((a, b) => a.item.localeCompare(b.item))
    .forEach((ingredient) => {
      const itemKey = `${ingredient.item}|${ingredient.unit}`;
      const checkboxId = `${storageKeyPrefix}${itemKey}`;

      const li = document.createElement("li");
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = localStorage.getItem(checkboxId) === "1";
      checkbox.addEventListener("change", () => {
        localStorage.setItem(checkboxId, checkbox.checked ? "1" : "0");
      });

      const text = document.createElement("span");
      const amount = ingredient.amount !== null ? `${formatAmount(ingredient.amount)} ` : "";
      const unit = ingredient.unit ? `${ingredient.unit} ` : "";
      text.textContent = `${amount}${unit}${ingredient.item}`.trim();

      label.append(checkbox, text);
      li.appendChild(label);
      shoppingList.appendChild(li);
    });
};

const load = async () => {
  const [planText, recipesIndexText] = await Promise.all([
    fetch(PLAN_PATH).then((response) => response.text()),
    fetch(RECIPES_INDEX_PATH).then((response) => response.text()),
  ]);

  const plan = parsePlan(planText);
  weekLabel.textContent = `Week of ${plan.weekOf}`;

  const recipeSlugs = recipesIndexText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));

  const recipesBySlug = new Map();
  await Promise.all(
    recipeSlugs.map(async (slug) => {
      const markdown = await fetch(`${plan.recipeFolder}/${slug}.md`).then((response) => response.text());
      recipesBySlug.set(slug, parseRecipe(slug, markdown));
    })
  );

  daySelect.replaceChildren();
  plan.days.forEach((day) => {
    const option = document.createElement("option");
    option.value = day.name;
    option.textContent = `${day.name}: ${recipesBySlug.get(day.recipe)?.title || day.recipe}`;
    daySelect.appendChild(option);
  });

  const weeklyRecipes = [...new Set(plan.days.map((day) => day.recipe))]
    .map((slug) => recipesBySlug.get(slug))
    .filter(Boolean);
  buildShoppingList(weeklyRecipes, plan.weekOf);

  const updateDayView = () => {
    const selectedDay = plan.days.find((day) => day.name === daySelect.value) || plan.days[0];
    const recipe = recipesBySlug.get(selectedDay.recipe);
    if (selectedDay && recipe) {
      renderDay(selectedDay, recipe);
    }
  };

  daySelect.addEventListener("change", updateDayView);
  updateDayView();
};

load().catch((error) => {
  weekLabel.textContent = "Unable to load meal plan.";
  console.error(error);
});
