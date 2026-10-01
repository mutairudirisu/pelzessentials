update public.products as product
set image_url = images.image_url
from (values
  ('cloud-plush-blanket', '/plush_blanket/Cozy%20Sherpa%20Throw%20-%20Ultimate%20Knit%20Blanket_%20Cozy%20Comfort.jpg'),
  ('weekend-fleece-throw', '/plush_blanket/Bedsure%20Throw%20Blankets.jpg'),
  ('rose-garden-blanket', '/plush_blanket/Plush%20Throw%20Blankets%20on%20a%20Budget%20_%20Dusty%20Rose%2C%20White%20%26%20Gray%20Stack.jpg'),
  ('sage-cloud-blanket', '/plush_blanket/Faux%20Fur%20Throw%20Blanket%20Cozy%20Warm%20Plush%20Blanket%20for%20Sofa%20or%20Bed.jpg'),
  ('everyday-tote', '/tote_bag/Light%20Tote%20Bag.jpg'),
  ('market-day-canvas', '/tote_bag/tote%20bag%20%20design.jpg'),
  ('woven-weekend-tote', '/tote_bag/download%20%282%29.jpg'),
  ('little-day-tote', '/tote_bag/download%20%283%29.jpg'),
  ('studio-gym-mat', '/Gym-Mat/Premium%20Ribbed%20Yoga%20Mat%20with%20Carrying%20Straps%20for%20Home%20Workouts.jpg'),
  ('daily-flow-mat', '/Gym-Mat/My%2010%20Best%20Meditation%20Mats%20for%20Not%20Hurting%20Your%20Knees.jpg'),
  ('cork-balance-mat', '/Gym-Mat/Bodenmatten%2C%206%20St%C3%BCck%2C%20Gummi-Oberfl%C3%A4che%20%26%20EVA-Schaum%2C%20315%20x%20315%20mm%2C%20Trainingsmatten%20mit%2024%20Quadratfu%C3%9F.jpg'),
  ('fold-and-go-mat', '/Gym-Mat/How%20weather%20changes%20can%20affect%20joint%20comfort.jpg'),
  ('daily-essentials-set', '/Personal-Essentials/Groomsmen%20Gifts%20Personalized%20Leather%20Toiletry%20Bag%20_%20Custom%20Dopp%20Kit%20_%20Shaving%20Kit%20_%20Gift%20for%20Him.jpg'),
  ('glow-ritual-kit', '/Personal-Essentials/gorchis%20New%20Fashion%20Clutch%20Bag%20With%20Password%20Lock%20And%20Multiple%20Pockets%2C%20Handheld%20Bag%20For%20Phone%20And%20Accessories%2C%20Suitable%20For%20Business%20And%20Casual%20Occasions%20For%20Travel%20Fall%20Stuff%20Anti-Theft%20Portable%E2%80%A6.jpg'),
  ('fresh-start-care-set', '/Personal-Essentials/FASTRACK%20unisex%20black%20Analog%20watch.jpg'),
  ('little-travel-essentials', '/Personal-Essentials/%D0%A2%D0%B5%D1%80%D0%BC%D0%BE%D0%B1%D1%83%D1%82%D1%8B%D0%BB%D0%BA%D0%B0%20%D1%87%D1%91%D1%80%D0%BD%D0%B0%D1%8F.jpg'),
  ('active-day-duffel', '/Dolphin-bags/Adidas%20Crossbody%20Bag%20JZ0608%20_%20Unisex%20One%20Shoulder%20Sports%20Tote%20Bag%20Outdoor%20Casual%20Fitness%20Travel%20Bag.jpg'),
  ('move-light-backpack', '/Dolphin-bags/adidas%20Unisex%20Bolsa%20de%20Deporte%20Essentials.jpg'),
  ('after-class-weekender', '/Dolphin-bags/Ultimate%20Gym%20Bag%20Aesthetic%20_%20Aesthetic%20Workout%20Essentials.jpg'),
  ('quick-reset-sling', '/Dolphin-bags/40%20Of%20The%20Best%20Gym%20Bags%20For%20Carrying%20_All_%20Your___.jpg'),
  ('dolphin-weekender', '/Dolphin-bags/Personalised%20Gym%20Bag%20for%20the%20Motivated%20Fitness%E2%80%A6.jpg'),
  ('dolphin-city-tote', '/Dolphin-bags/TRAVEL%20BAG.jpg'),
  ('dolphin-travel-carryall', '/Dolphin-bags/633952085093384586.jpg'),
  ('dolphin-mini-crossbody', '/Dolphin-bags/37%20Types%20of%20Bags%20For%20Women.jpg')
) as images(id, image_url)
where product.id = images.id;
