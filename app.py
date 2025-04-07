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
def get_decade_avg_imdb():
    # Группировка по десятилетиям и расчёт среднего IMDb
    decade_avg_imdb = data.groupby('decade')['imdb'].mean().reset_index()

    # Обеспечим наличие всех десятилетий
    decades = ['1990s', '2000s', '2010s', '2020s']
    decade_avg = {decade: None for decade in decades}
    for _, row in decade_avg_imdb.iterrows():
        if row['decade'] in decade_avg:
            decade_avg[row['decade']] = round(row['imdb'], 2)

    return jsonify({
        'labels': decades,
        'data': [decade_avg[decade] for decade in decades]
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
        title=" ",
        labels={"score": "Rating ", "count": "Number of films"},
        color_discrete_map={"IMDb": "#ff0073", "Metascore": "#7401ff"},
        template="plotly_dark"
    )

    fig.update_layout(
        xaxis_title="Rating",
        yaxis_title="Number of films",
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
        go.Bar(name="IMDb", x=genre_list, y=imdb_list, marker_color="#ff0073"),
        go.Bar(name="Metascore(scaled)", x=genre_list, y=metascore_list, marker_color="#7401ff")
    ])

    fig.update_layout(
        barmode="stack",
        title=" ",
        xaxis_title="Genre",
        yaxis_title="Average rating",
        template="plotly_dark",
        font=dict(size=14)
    )

    return {
        "data": fig.to_dict()["data"],
        "layout": fig.to_dict()["layout"]
    }

@app.route("/api/radar_chart")
def radar_chart():
    try:
        import json
        import pandas as pd
        import numpy as np
        from collections import defaultdict
        import plotly.graph_objects as go

        # Загрузка данных
        with open("data_wrangling/data/films_all_known.json", "r", encoding="utf-8") as f:
            films = json.load(f)

        # Группировка по жанрам
        genre_revenue = defaultdict(list)
        genre_budget = defaultdict(list)

        for film in films:
            if not film.get("genres"):
                continue

            for genre in film["genres"]:
                if film.get("box_office"):
                    genre_revenue[genre].append(film["box_office"])
                if film.get("production_budget"):
                    genre_budget[genre].append(film["production_budget"])

        # Расчёт средних значений
        avg_revenue = {genre: np.mean(values) for genre, values in genre_revenue.items()}
        avg_budget = {genre: np.mean(values) for genre, values in genre_budget.items()}

        # Объединение в DataFrame
        genres = sorted(set(avg_budget.keys()))
        combined_data = [
            {
                "Genre": genre,
                "Avg Box Office": avg_revenue.get(genre, 0),
                "Avg Budget": avg_budget.get(genre, 0)
            }
            for genre in genres
        ]

        df_combined = pd.DataFrame(combined_data)
        df_combined = df_combined.sort_values("Avg Budget", ascending=False)

        # Построение радара
        fig = go.Figure()

        fig.add_trace(go.Scatterpolar(
            r=df_combined["Avg Box Office"].tolist(),
            theta=df_combined["Genre"].tolist(),
            fill='toself',
            name='Avg Box Office'
        ))

        fig.add_trace(go.Scatterpolar(
            r=df_combined["Avg Budget"].tolist(),
            theta=df_combined["Genre"].tolist(),
            fill='toself',
            name='Avg Budget'
        ))

        fig.update_layout(
            template="plotly_dark",  # Тёмная тема
            paper_bgcolor="black",   # Фон всего холста
            plot_bgcolor="black",    # Фон области графика
            polar=dict(
                bgcolor="black",  # Фон круга
                radialaxis=dict(visible=True, color="white"),  # Оси — белые
                angularaxis=dict(color="white")               # Подписи — белые
            ),
            font=dict(color="white"),  # Цвет текста на графике
            showlegend=True,
            title=" "
        )


        return fig.to_json()

    except Exception as e:
        return f"Error: {e}", 500

@app.route("/api/imdb_trends")
def imdb_trends():
    with open("data_wrangling/data/films_all_known.json", "r", encoding="utf-8") as f:
        films = json.load(f)

    # Подготовка данных
    data = []
    for film in films:
        if film.get("imdb") and film.get("year"):
            data.append({"year": film["year"], "imdb": film["imdb"]})

    df = pd.DataFrame(data)
    df["period"] = (df["year"] // 5) * 5

    result = []
    for period, group in df.groupby("period"):
        total = len(group)
        high = len(group[group["imdb"] > 7.0]) / total * 100
        mid = len(group[(group["imdb"] >= 6) & (group["imdb"] <= 7.0)]) / total * 100
        low = len(group[group["imdb"] < 6]) / total * 100
        avg = group["imdb"].mean()
        result.append({
            "period": period,
            "high_pct": round(high, 2),
            "mid_pct": round(mid, 2),
            "low_pct": round(low, 2),
            "avg_rating": round(avg, 2)
        })

    return jsonify(result)




if __name__ == '__main__':
    app.run(debug=True, port=5000)
