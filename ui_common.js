async function callApi(url,body){
    let options = {'method' : 'GET'};

    if(body !== undefined) {
        options = {
            'method' : 'POST',
            'body' : JSON.stringify(body),
            'headers' : {'Content-Type' : 'application/json'},
        };
    }

    let response = await fetch(url, options);
    let data = null;
    try{
        data = await response.json();
    }catch(err){
        data = {'error': `The server did not answer with JSON (status ${response.status}).`}
    }
    if(!response.ok){
        const error = new Error(data.error);
        error.status = res.status;
        error.data = data;
        throw error;
    }
    
    return data;
}
