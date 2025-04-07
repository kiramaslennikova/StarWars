from flask import Flask, jsonify
import pandas as pd
import json
import numpy as np
from flask_cors import CORS
import plotly.io as pio


app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)  # Enable CORS to allow frontend requests

# Load and process the movie data
def load_json_to_df(file_path):
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        return pd.DataFrame(data)
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return None

# Load the data
data = load_json_to_df('data_wrangling/data/films_all_known.json')
# Process cast popularity
def calculate_cast_popularity(cast_list):
    if not cast_list:
        return np.nan
    # Extract actors rankings (less - more popular)
    rankings = []
    for actor in cast_list:
        ranking = actor.get('popularity', None)  
        if ranking != 0:
            rankings.append(ranking)
        else:
            rankings.append(1000000)  # For actors with null choose very big number
    if not rankings:
        return np.nan
    # Take mean of 5 most popular actors of the cast
    rankings.sort()
    cast_rank = []
    for rank in rankings:
        if rank != 1000000:
            cast_rank.append(rank)
        if len(cast_rank) == 5:
            break

    return sum(cast_rank)/5


data['cast_popularity'] = data['actors'].apply(calculate_cast_popularity)


# Categorize profit
def categorize_profit(row):
    if pd.isna(row['box_office']) or pd.isna(row['production_budget']):
        return np.nan
    if row['box_office'] < row['production_budget']:
        return '1. Box Office < Budget'
    elif row['box_office'] < row['production_budget'] * 2:
        return '2. Budget ≤ Box Office < 2x Budget'
    else:
        return '3. Box Office ≥ 2x Budget'

data['profit_category'] = data.apply(categorize_profit, axis=1)


# Helper function to extract year and decade
def get_decade(year):
    if pd.isna(year):
        return np.nan
    year = int(year)
    return f"{(year // 10) * 10}s"

data['decade'] = data['year'].apply(get_decade)

# API Endpoints

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

@app.route('/api/genres', methods=['GET'])
def get_genre_data():
    # Aggregate average box office by genre
    # Assuming 'genres' is a list of genres for each movie
    genre_data = data.explode('genres').groupby('genres')['box_office'].mean().reset_index()
    # Convert box office to millions
    genre_data['box_office'] = genre_data['box_office'] / 1_000_000
    # Sort by box office and take top 5
    genre_data = genre_data.sort_values('box_office', ascending=False).head(5)
    return jsonify({
        'labels': genre_data['genres'].tolist(),
        'data': genre_data['box_office'].round(2).tolist()
    })

@app.route('/api/decade_hits', methods=['GET'])
def get_decade_hits_data():
    # Define a "hit" based on multiple criteria
    high_rating_threshold_imdb = 7.5    # IMDb ≥ 7.5
    high_rating_threshold_metascore = 75  # Metascore ≥ 75

    # Create a 'is_hit' column based on the criteria
    data['is_hit'] = (
        (data['profit_category'] == '3. Box Office ≥ 2x Budget') # Highly profitable
        # &  
        # (data['imdb'] >= high_rating_threshold_imdb) &  # High IMDb rating
        # (data['metascore'] >= high_rating_threshold_metascore)  # High Metascore
    )

    # Count hits per decade
    decade_hits = data[data['is_hit']].groupby('decade').size().reset_index(name='count')

    # Ensure all decades are present
    decades = ['1990s', '2000s', '2010s', '2020s']
    decade_counts = {decade: 0 for decade in decades}
    for _, row in decade_hits.iterrows():
        if row['decade'] in decade_counts:
            decade_counts[row['decade']] = row['count']

    print(decade_counts)
    return jsonify({
        'labels': decades,
        'data': [decade_counts[decade] for decade in decades]
    })

@app.route('/api/actors', methods=['GET'])
def get_actor_data():
    # Aggregate total box office by actor
    actor_data = data.explode('actors').copy()

    def extract_full_name(actor):
        if not isinstance(actor, dict):
            return None
        if 'name' in actor and 'surname' in actor:
            if f"{actor['name']} {actor['surname']}" == "Robert Jr.":
                return "Robert Downey Jr."
            return f"{actor['name']} {actor['surname']}"
        return None

    actor_data['actor_name'] = actor_data['actors'].apply(extract_full_name)    
    actor_box_office = actor_data.groupby('actor_name')['box_office'].sum().reset_index()
    # Convert to billions
    actor_box_office['box_office'] = actor_box_office['box_office'] / 1_000_000_000
    # Sort and take top 5
    actor_box_office = actor_box_office.sort_values('box_office', ascending=False).head(5)
    return jsonify({
        'labels': actor_box_office['actor_name'].tolist(),
        'data': actor_box_office['box_office'].round(2).tolist()
    })

@app.route('/api/budget_box_office', methods=['GET'])
def get_budget_box_office_data():
    # Prepare scatter plot data for budget vs box office
    scatter_data = data[['production_budget', 'box_office', 'profit_category']].dropna()
    # Convert to millions
    scatter_data['production_budget'] = scatter_data['production_budget'] / 1_000_000
    scatter_data['box_office'] = scatter_data['box_office'] / 1_000_000
    # Group by profit category
    datasets = []
    for category in ['1. Box Office < Budget', '2. Budget ≤ Box Office < 2x Budget', '3. Box Office ≥ 2x Budget']:
        category_data = scatter_data[scatter_data['profit_category'] == category]
        datasets.append({
            'label': category,
            'data': [{'x': row['production_budget'], 'y': row['box_office']} for _, row in category_data.iterrows()]
        })
    return jsonify(datasets)

@app.route('/api/imdb_metascore', methods=['GET'])
def get_imdb_metascore_data():
    # Prepare scatter plot data for IMDb vs Metascore
    scatter_data = data[['imdb', 'metascore', 'profit_category']].dropna()
    datasets = []
    for category in ['1. Box Office < Budget', '2. Budget ≤ Box Office < 2x Budget', '3. Box Office ≥ 2x Budget']:
        category_data = scatter_data[scatter_data['profit_category'] == category]
        datasets.append({
            'label': category,
            'data': [{'x': row['imdb'], 'y': row['metascore']} for _, row in category_data.iterrows()]
        })
    return jsonify(datasets)

@app.route("/animated_ratings")
def animated_ratings():
    import plotly.express as px
    import pandas as pd
    import json
    from collections import Counter

    with open("data_wrangling/data/films_metascore_unknown.json", "r", encoding="utf-8") as f:
        films = json.load(f)

    genre_counter = Counter()
    for film in films:
        if "genres" in film:
            genre_counter.update(film["genres"])

    top_10_genres = {genre for genre, _ in genre_counter.most_common(10)}

    data = []
    for film in films:
        if "genres" in film and film["imdb"] and film["metascore"]:
            imdb_rounded = round(film["imdb"] * 2) / 2
            metascore_rounded = round(film["metascore"] / 5) * 5
            for genre in film["genres"]:
                if genre in top_10_genres:
                    data.append({"genre": genre, "rating_type": "IMDb", "score": imdb_rounded})
                    data.append({"genre": genre, "rating_type": "Metascore", "score": metascore_rounded / 10})

    df = pd.DataFrame(data)

    fig = px.histogram(
        df,
        x="score",
        color="rating_type",
        barmode="group",
        animation_frame="genre",
        title="Распределение IMDb и Metascore по жанрам",
        labels={"score": "Рейтинг (в шкале до 10)", "count": "Количество фильмов"},
        color_discrete_map={"IMDb": "lightblue", "Metascore": "orange"},
        template="plotly_dark"
    )

    fig.update_layout(
        xaxis_title="Рейтинг",
        yaxis_title="Количество фильмов",
        title_font_size=20,
        font=dict(size=14),
        bargap=0.1
    )

    return fig.to_html(full_html=False)

@app.route("/api/stacked_avg_ratings")
def stacked_avg_ratings():
    import json
    import pandas as pd
    import plotly.graph_objects as go
    from collections import Counter

    with open("data_wrangling/data/films_metascore_unknown.json", "r", encoding="utf-8") as f:
        films = json.load(f)

    genre_counter = Counter()
    for film in films:
        if "genres" in film:
            genre_counter.update(film["genres"])

    top_20_genres = [genre for genre, _ in genre_counter.most_common(20)]  # Сохраняем порядок

    genre_ratings = {genre: {"imdb": [], "metascore": []} for genre in top_20_genres}

    for film in films:
        if "genres" in film and film["imdb"] and film["metascore"]:
            for genre in film["genres"]:
                if genre in top_20_genres:
                    genre_ratings[genre]["imdb"].append(film["imdb"])
                    genre_ratings[genre]["metascore"].append(film["metascore"])

    # Вычисляем средние значения
    genre_list = []
    imdb_list = []
    metascore_list = []

    for genre in top_20_genres:
        imdb_scores = genre_ratings[genre]["imdb"]
        metascore_scores = genre_ratings[genre]["metascore"]
        if imdb_scores and metascore_scores:
            genre_list.append(genre)
            imdb_list.append(round(sum(imdb_scores) / len(imdb_scores), 2))
            metascore_list.append(round((sum(metascore_scores) / len(metascore_scores)) / 10, 2))

    fig = go.Figure(data=[
        go.Bar(name="IMDb", x=genre_list, y=imdb_list, marker_color="lightblue"),
        go.Bar(name="Metascore (приведённый)", x=genre_list, y=metascore_list, marker_color="orange")
    ])

    fig.update_layout(
        barmode="stack",
        title="Сложенная диаграмма среднего IMDb и Metascore по жанрам (ТОП-20)",
        xaxis_title="Жанр",
        yaxis_title="Средний рейтинг (до 10)",
        template="plotly_dark",
        font=dict(size=14)
    )

    # Возвращаем как dict, не как JSON string
    return {
        "data": fig.to_dict()["data"],
        "layout": fig.to_dict()["layout"]
    }



if __name__ == '__main__':
    app.run(debug=True, port=5000)
